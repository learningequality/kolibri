import logging
import os

from django.core.management.base import CommandError

from kolibri.core.content.constants.transfer_types import COPY_METHOD
from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.channel_transfer import transfer_channel
from kolibri.core.content.utils.channels import discard_stale_upgrade_database
from kolibri.core.content.utils.channels import is_channel_database_current
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
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

_LOOKUP_CONNECTION_ERRORS = (
    NetworkLocationConnectionFailure,
    NetworkLocationNotFound,
    NetworkLocationResponseFailure,
    NetworkLocationResponseTimeout,
)


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
            help=f"The host we will download the content from. Defaults to {default_studio_url}",
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

    def _lookup_listing(self, baseurl, **identifier):
        try:
            return lookup_channel_listing_status(baseurl=baseurl, **identifier)
        except _LOOKUP_CONNECTION_ERRORS as e:
            raise CommandError(
                "Could not connect to content server at '{}'.".format(
                    baseurl or "Kolibri Studio"
                )
            ) from e
        except LocationError as e:
            raise CommandError(str(e)) from e

    def _resolve_token(self, token, baseurl):
        metadata = self._lookup_listing(baseurl, token=token)

        if metadata is None:
            raise CommandError(f"Token '{token}' not found on content server.")

        channel_id = metadata.get("id")
        if not channel_id:
            raise CommandError(
                f"Invalid response: token '{token}' resolved to a channel without an ID."
            )
        return channel_id, metadata

    def _has_local_channel(self, channel_id, content_dir):
        return ChannelMetadata.objects.filter(id=channel_id).exists() or os.path.isfile(
            paths.get_content_database_file_path(channel_id, contentfolder=content_dir)
        )

    def _lookup_uuid_listing(self, channel_id, baseurl, content_dir):
        if not (
            self._has_local_channel(channel_id, content_dir)
            or os.path.isfile(
                paths.get_upgrade_content_database_file_path(
                    channel_id, contentfolder=content_dir
                )
            )
        ):
            return None
        return self._lookup_listing(baseurl, channel_id=channel_id)

    def _stage_remote_database(self, channel_id, url_version, baseurl, content_dir):
        logger.info(
            "Downloading data for channel id %s to compare versions", channel_id
        )
        transfer_channel(
            channel_id=channel_id,
            method=DOWNLOAD_METHOD,
            no_upgrade=True,
            content_dir=content_dir,
            baseurl=baseurl,
            version=url_version,
        )
        return read_channel_metadata_from_db_file(
            paths.get_upgrade_content_database_file_path(
                channel_id, contentfolder=content_dir
            )
        )["version"]

    def download_channel(self, channel_id, baseurl, no_upgrade, content_dir):
        is_token = not is_valid_uuid(channel_id)
        if is_token:
            resolved_channel_id, listing = self._resolve_token(channel_id, baseurl)
        else:
            resolved_channel_id = channel_id
            listing = self._lookup_uuid_listing(channel_id, baseurl, content_dir)
        listing_version = (listing or {}).get("version")

        url_version = None
        if is_token:
            url_version = "next" if listing_version is None else listing_version

        staged = False
        if listing_version is not None:
            discard_stale_upgrade_database(
                resolved_channel_id, listing_version, content_dir
            )
            remote_version = listing_version
        elif not no_upgrade and self._has_local_channel(
            resolved_channel_id, content_dir
        ):
            remote_version = self._stage_remote_database(
                resolved_channel_id, url_version, baseurl, content_dir
            )
            staged = True
        else:
            remote_version = None

        if is_channel_database_current(
            resolved_channel_id, remote_version, content_dir
        ):
            if staged:
                os.remove(
                    paths.get_upgrade_content_database_file_path(
                        resolved_channel_id, contentfolder=content_dir
                    )
                )
            logger.info("Channel %s is already up to date", resolved_channel_id)
            if is_token:
                set_channel_metadata_fields(
                    resolved_channel_id, library=listing.get("library")
                )
            return

        logger.info("Importing data for channel id %s", resolved_channel_id)
        transfer_channel(
            channel_id=resolved_channel_id,
            method=DOWNLOAD_METHOD,
            no_upgrade=no_upgrade,
            content_dir=content_dir,
            baseurl=baseurl,
            version=url_version,
        )

        # Persist token-resolved metadata when available
        if is_token and not no_upgrade:
            set_channel_metadata_fields(
                resolved_channel_id,
                library=listing.get("library"),
                version=listing_version or 0,
            )

    def copy_channel(self, channel_id, source_path, no_upgrade, content_dir):
        if not is_valid_uuid(channel_id):
            raise CommandError(
                f"Invalid channel ID '{channel_id}'. Disk import requires a UUID, not a token."
            )

        logger.info("Copying in data for channel id %s", channel_id)
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
