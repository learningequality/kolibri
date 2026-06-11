import logging

from django.core.management.base import CommandError

from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.channel_transfer import transfer_channel
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.resource_import import lookup_channel_listing_status
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils import conf
from kolibri.utils.uuids import is_valid_uuid

from ...utils import paths

logger = logging.getLogger(__name__)


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
        Resolve a channel identifier (UUID or token) to (channel_id, listing_metadata).

        For UUIDs, returns the identifier directly with no metadata lookup.
        For tokens, calls lookup_channel_listing_status by token and validates the result.
        Returns (channel_id, metadata_dict_or_None) or raises CommandError.
        """
        if is_valid_uuid(identifier):
            return identifier, None

        # Token path
        try:
            metadata = lookup_channel_listing_status(token=identifier, baseurl=baseurl)
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
        except LocationError as e:
            raise CommandError(str(e))

        if metadata is None:
            raise CommandError(
                "Token '{}' not found on content server.".format(identifier)
            )

        channel_id = metadata.get("id")
        if not channel_id:
            raise CommandError(
                "Invalid response: token '{}' resolved to a channel without an ID.".format(
                    identifier
                )
            )
        return channel_id, metadata

    def download_channel(self, channel_id, baseurl, no_upgrade, content_dir):
        resolved_channel_id, metadata = self._resolve_channel_identifier(
            channel_id, baseurl
        )

        raw_version = None
        version = None
        if metadata is not None:
            raw_version = metadata.get("version")
            version = "next" if raw_version is None else raw_version

        logger.info("Downloading data for channel id {}".format(resolved_channel_id))
        transfer_channel(
            channel_id=resolved_channel_id,
            method=DOWNLOAD_METHOD,
            no_upgrade=no_upgrade,
            content_dir=content_dir,
            baseurl=baseurl,
            version=version,
        )

        # Persist token-resolved metadata when available
        if metadata:
            set_channel_metadata_fields(
                resolved_channel_id,
                library=metadata.get("library"),
                version=0 if raw_version is None else raw_version,
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
