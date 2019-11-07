import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)

    def handle(self, *args, **options):
        channel_id = options["channel_id"]
        call_command("deletecontent", channel_id)
