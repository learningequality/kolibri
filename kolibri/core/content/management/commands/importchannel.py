import logging

from django.core.management.base import CommandError

from ...utils import paths
from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
from kolibri.core.content.utils.channel_transfer import transfer_channel
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf
from kolibri.utils.uuids import is_valid_uuid

logger = logging.getLogger(__name__)


def resolve_channel_token(token, baseurl=None):
    """
    Resolve a channel token to a channel ID by querying the channel lookup endpoint.

    :param token: The channel token to resolve
    :param baseurl: The base URL of the content server (defaults to Studio)
    :return: Tuple of (channel_id, all_channels) where all_channels is the full list
    :raises: ValueError if the token is not found or response is invalid
    """
    baseurl = baseurl or CENTRAL_CONTENT_BASE_URL
    client = NetworkClient.build_for_address(baseurl)
    response = client.get(get_channel_lookup_url(identifier=token))

    try:
        channels = response.json()
    except ValueError as e:
        raise ValueError("Invalid JSON response: {}".format(e))

    if not channels or not isinstance(channels, list):
        raise ValueError("Token '{}' not found on content server".format(token))

    for channel in channels:
        if not channel.get("id"):
            raise ValueError("Invalid response: channel missing ID")

    return channels[0]["id"], channels


class Command(AsyncCommand):
    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # see `importcontent` management command for explanation of how we're using subparsers
        subparsers = parser.add_subparsers(
            dest="command", help="The following subcommands are available."
        )

        network_subparser = subparsers.add_parser(
            "network",
            help="Download the given channel through the network.",
        )
        network_subparser.add_argument(
            "channel_id",
            type=str,
            help="Download the database for the given channel_id or channel token. "
            "Tokens are resolved by querying the content server (e.g., Kolibri Studio).",
        )

        default_studio_url = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        network_subparser.add_argument(
            "--baseurl",
            type=str,
            default=default_studio_url,
            help="The host we will download the content from. Defaults to {}".format(
                default_studio_url
            ),
        )
        network_subparser.add_argument(
            "--no_upgrade",
            action="store_true",
            help="Only download database to an upgrade file path.",
        )
        network_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Download the database to the given content dir.",
        )

        local_subparser = subparsers.add_parser(
            "disk", help="Copy the content from the given folder."
        )
        local_subparser.add_argument(
            "channel_id",
            type=str,
            help="Import this channel id from the given directory. "
            "Note: Only channel IDs (UUIDs) are accepted, not tokens.",
        )
        local_subparser.add_argument(
            "directory", type=str, help="Import content from this directory."
        )
        local_subparser.add_argument(
            "--no_upgrade",
            action="store_true",
            help="Only download database to an upgrade file path.",
        )
        local_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Download the database to the given content dir.",
        )

    def _resolve_channel_identifier(self, identifier, baseurl):
        """
        Resolve a channel identifier (UUID or token) to a channel_id.
        """
        if is_valid_uuid(identifier):
            return identifier

        try:
            channel_id, all_channels = resolve_channel_token(
                identifier, baseurl=baseurl
            )
        except (
            NetworkLocationConnectionFailure,
            NetworkLocationNotFound,
            NetworkLocationResponseFailure,
            NetworkLocationResponseTimeout,
        ):
            raise CommandError(
                "Could not connect to content server at '{}'.".format(
                    baseurl or "Kolibri Studio"
                )
            )
        except ValueError as e:
            raise CommandError(str(e))

        if len(all_channels) > 1:
            channel_list = ", ".join(
                "{} ({})".format(c.get("name", "Unnamed"), c["id"])
                for c in all_channels
            )
            raise CommandError(
                "Token '{}' matches multiple channels: {}. "
                "Use a channel ID instead.".format(identifier, channel_list)
            )

        return channel_id

    def download_channel(self, channel_id, baseurl, no_upgrade, content_dir):
        # Resolve the identifier (could be channel_id or token)
        resolved_channel_id = self._resolve_channel_identifier(channel_id, baseurl)

        logger.info("Downloading data for channel id {}".format(resolved_channel_id))
        transfer_channel(
            channel_id=resolved_channel_id,
            method=DOWNLOAD_METHOD,
            no_upgrade=no_upgrade,
            content_dir=content_dir,
            baseurl=baseurl,
        )

    def copy_channel(self, channel_id, source_path, no_upgrade, content_dir):
        if not is_valid_uuid(channel_id):
            raise CommandError(
                "Invalid channel ID '{}'. Disk import requires a UUID, not a token.".format(
                    channel_id
                )
            )

        logger.info("Copying in data for channel id {}".format(channel_id))
        transfer_channel(
            channel_id=channel_id,
            method=COPY_METHOD,
            no_upgrade=no_upgrade,
            content_dir=content_dir,
            source_path=source_path,
        )

    def handle_async(self, *args, **options):
        if options["command"] == "network":
            self.download_channel(
                options["channel_id"],
                options["baseurl"],
                options["no_upgrade"],
                options["content_dir"],
            )
        elif options["command"] == "disk":
            self.copy_channel(
                options["channel_id"],
                options["directory"],
                options["no_upgrade"],
                options["content_dir"],
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )
