import logging

from kolibri.core.content.utils.resource_export import DiskChannelResourceExportManager
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("destination", type=str)

    def handle_async(self, *args, **options):
        channel_id = options["channel_id"]
        destination = options["destination"]
        manager = DiskChannelResourceExportManager(
            channel_id,
            destination,
            export_channel_database=True,
            export_content=False,
        )
        manager.run()
