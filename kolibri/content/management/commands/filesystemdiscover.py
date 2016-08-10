import logging

from kolibri.tasks.management.commands.base import AsyncCommand
from kolibri.content.utils.channels import find_kolibri_data_in_mountpoints

logger = logging.getLogger(__name__)


class Command(AsyncCommand):

    def add_arguments(self, parser):
        pass

    def handle_async(self, *args, **options):
        out = find_kolibri_data_in_mountpoints(physical_drives_only=False)
        return str(out)
