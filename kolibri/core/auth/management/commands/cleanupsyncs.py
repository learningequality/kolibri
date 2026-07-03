from django.core.management.base import CommandError
from morango.management.commands.cleanupsyncs import Command as CleanupsyncCommand

from kolibri.core.auth.errors import DeviceNotProvisionedError
from kolibri.core.auth.utils.sync import cleanup_sync_sessions


class Command(CleanupsyncCommand):
    def handle(self, *args, **options):
        try:
            cleanup_sync_sessions(
                ids=options["ids"],
                sync_filter=options["sync_filter"],
                client_instance_id=options["client_instance_id"],
                server_instance_id=options["server_instance_id"],
                push=options["push"],
                pull=options["pull"],
                expiration=options["expiration"],
            )
        except DeviceNotProvisionedError as e:
            raise CommandError(str(e)) from e
