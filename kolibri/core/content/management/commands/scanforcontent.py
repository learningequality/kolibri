from django.core.management.base import BaseCommand

from ...utils.annotation import set_local_file_availability_from_disk
from ...utils.annotation import update_content_metadata
from ...utils.channels import get_channel_ids_for_content_database_dir
from kolibri.core.content.utils.paths import get_content_database_dir_path


class Command(BaseCommand):
    """
    This command will try to fix the content tables in the database,
    reviewing the availability of all the existing files, to recover
    content that's not visible in Kolibri.
    """
    help = "Scan content in Kolibri folder and updates the database to show it available"

    def handle(self, *args, **options):
        channel_ids = get_channel_ids_for_content_database_dir(get_content_database_dir_path())
        set_local_file_availability_from_disk()
        for channel_id in channel_ids:
            update_content_metadata(channel_id)
