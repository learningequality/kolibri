import logging

from django.core.management.base import BaseCommand

from kolibri.core.content.utils.content_delete import delete_content

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)

    def handle(self, *args, **options):
        channel_id = options["channel_id"]
        delete_content(
            channel_id=channel_id,
            node_ids=None,
            exclude_node_ids=None,
            force_delete=False,
        )
