from morango.management.commands.cleanupsyncs import Command as CleanupsyncCommand

from kolibri.core.auth.utils.sync import cleanup_sync_sessions


class Command(CleanupsyncCommand):
    def handle(self, *args, **options):
        cleanup_sync_sessions(
            ids=options["ids"],
            sync_filter=options["sync_filter"],
            client_instance_id=options["client_instance_id"],
            server_instance_id=options["server_instance_id"],
            push=options["push"],
            pull=options["pull"],
            expiration=options["expiration"],
        )
