from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kolibri.core.device.utils import device_provisioned


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not device_provisioned():
            raise CommandError("Kolibri is unprovisioned")
