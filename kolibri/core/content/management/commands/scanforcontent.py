import logging

from django.core.management.base import BaseCommand
from sqlalchemy.exc import DatabaseError

from ...utils.annotation import set_content_visibility_from_disk
from ...utils.channel_import import FutureSchemaError
from ...utils.channel_import import import_channel_from_local_db
from ...utils.channel_import import InvalidSchemaVersionError
from ...utils.channels import get_channel_ids_for_content_database_dir
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.paths import get_content_database_dir_path

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This command will try to fix the content tables in the database,
    reviewing the availability of all the existing files, to recover
    content that's not visible in Kolibri.
    """

    help = "Scan content and databases in Kolibri folder and updates the database to show if available"

    def handle(self, *args, **options):
        storage_channel_ids = get_channel_ids_for_content_database_dir(
            get_content_database_dir_path()
        )
        database_channel_ids = list(
            ChannelMetadata.objects.all().values_list("id", flat=True)
        )
        all_channel_ids = set(storage_channel_ids + database_channel_ids)
        for channel_id in all_channel_ids:
            if channel_id not in database_channel_ids:
                try:
                    import_channel_from_local_db(channel_id)
                    set_content_visibility_from_disk(channel_id)
                except (InvalidSchemaVersionError, FutureSchemaError):
                    logger.warning(
                        "Tried to import channel {channel_id}, but database file was incompatible".format(
                            channel_id=channel_id
                        )
                    )
                except DatabaseError:
                    logger.warning(
                        "Tried to import channel {channel_id}, but database file was corrupted.".format(
                            channel_id=channel_id
                        )
                    )
            else:
                set_content_visibility_from_disk(channel_id)
