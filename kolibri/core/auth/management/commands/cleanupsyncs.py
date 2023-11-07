from django.core.management.base import CommandError
from morango.management.commands.cleanupsyncs import Command as CleanupsyncCommand

from kolibri.core.device.utils import device_provisioned


class Command(CleanupsyncCommand):
    def handle(self, *args, **options):
        if not device_provisioned():
            raise CommandError("Kolibri is unprovisioned")

        return super(Command, self).handle(*args, **options)
