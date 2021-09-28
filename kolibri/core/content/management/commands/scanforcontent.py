import logging
from argparse import SUPPRESS

from django.core.management.base import BaseCommand
from sqlalchemy.exc import DatabaseError

from ...utils.annotation import set_content_visibility_from_disk
from ...utils.channel_import import FutureSchemaError
from ...utils.channel_import import import_channel_from_local_db
from ...utils.channel_import import InvalidSchemaVersionError
from ...utils.channels import get_channel_ids_for_content_dirs
from ...utils.channels import read_channel_metadata_from_db_file
from ...utils.paths import get_content_database_file_path
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.paths import get_all_content_dir_paths

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This command will try to fix the content tables in the database,
    reviewing the availability of all the existing files, to recover
    content that's not visible in Kolibri.
    """

    help = "Scan content and databases in Kolibri folder and updates the database to show if available"

    def add_arguments(self, parser):

        channel_import_mode_help_text = """
        Specify the desired behavior for import of channel metadata databases. Value must be one of:
        - newer: only import if database version is higher than what we already have (default)
        - missing: only import if we do not yet have the channel at all in the primary database
        - none: do not import new channel databases, and only annotate for channels we already have
        """
        parser.add_argument(
            "--channel-import-mode",
            type=str,
            default="newer",
            choices=["newer", "missing", "none"],
            required=False,
            dest="channel_import_mode",
            help=channel_import_mode_help_text,
        )

        channels_help_text = """
        Constrain the content scan to a particular set of channels. Other channels will not be imported
        or annotated. Separate multiple channel IDs with commas.
        """
        parser.add_argument(
            "--channels",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(","),
            default=None,
            required=False,
            dest="channels",
            help=channels_help_text,
        )

        # Hidden option to skip annotate_channel for discovered channels
        # With this option, scanforcontent will only scan for channel
        # database files without changing content visibility. This is
        # useful for managing content extensions in the Kolibri desktop
        # application.
        parser.add_argument(
            "--skip-annotations",
            required=False,
            action="store_true",
            dest="skip_annotations",
            help=SUPPRESS,
        )

    def handle(self, *args, **options):

        channel_import_mode = options["channel_import_mode"]
        channels_to_include = options["channels"]
        skip_annotations = options["skip_annotations"]

        storage_channel_ids = get_channel_ids_for_content_dirs(
            get_all_content_dir_paths()
        )
        database_channel_ids = list(
            ChannelMetadata.objects.all().values_list("id", flat=True)
        )
        all_channel_ids = set(storage_channel_ids + database_channel_ids)

        # if told not to import any channel databases, constrain to ones we already have
        if channel_import_mode == "none":
            all_channel_ids = set(database_channel_ids)

        # if an explicit set of channels was specified, filter out anything not included in that
        if channels_to_include:
            all_channel_ids = all_channel_ids.intersection(channels_to_include)

        for channel_id in all_channel_ids:
            disk_path = get_content_database_file_path(channel_id)

            if channel_id not in storage_channel_ids or channel_import_mode == "none":
                import_database = False
            elif channel_import_mode == "missing":
                import_database = channel_id not in database_channel_ids
            if channel_import_mode == "newer":
                import_database = self.database_file_is_newer(channel_id, disk_path)
            if import_database:
                self.import_channel_database(channel_id, disk_path)

            if not skip_annotations:
                self.annotate_channel(channel_id)

    def database_file_is_newer(self, channel_id, disk_path):
        try:
            disk_channel = read_channel_metadata_from_db_file(disk_path)
            db_channel = ChannelMetadata.objects.get(id=channel_id)
            # the version in the primary database is older than the one on disk
            return disk_channel["version"] > db_channel.version
        except DatabaseError:
            # problem with the database on disk; it can't be considered newer
            return False
        except ChannelMetadata.DoesNotExist:
            # we don't have the channel in our primary database, so it's newer by default
            return True

    def import_channel_database(self, channel_id, disk_path):
        logger.info("Attempting import of channel database at: {}".format(disk_path))
        try:
            import_channel_from_local_db(channel_id)
        except (InvalidSchemaVersionError, FutureSchemaError):
            logger.warning("Database file was incompatible; skipping.")
        except DatabaseError:
            logger.warning("Database file was corrupted; skipping.")

    def annotate_channel(self, channel_id):
        logger.info("Annotating availability for channel: {}".format(channel_id))
        set_content_visibility_from_disk(channel_id)
