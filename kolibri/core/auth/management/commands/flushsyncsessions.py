import logging

from django.db.models import Q
from morango.models import Buffer
from morango.models import RecordMaxCounterBuffer
from morango.models import SyncSession
from morango.models import TransferSession

from kolibri.core.auth.management.utils import GroupDeletion
from kolibri.core.auth.utils import confirm_or_exit
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    help = "This command initiates the deletion process for temporary sync session buffers."

    def add_arguments(self, parser):
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):
        noninteractive = options["noninteractive"]

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit("Are you sure you wish to delete all sync session buffers?")

        delete_group = GroupDeletion("Main", sleep=1, groups=self._get_delete_groups())

        # run the counting step
        with self.start_progress(total=delete_group.group_count()) as update_progress:
            update_progress(increment=0, message="Counting database objects")
            total_count = delete_group.count(update_progress)

        # no the deleting step
        with self.start_progress(total=total_count) as update_progress:
            update_progress(increment=0, message="Deleting database objects")
            delete_group.delete(update_progress)

        logger.info("Deletion complete.")

    def _get_delete_groups(self):
        sync_session_ids = SyncSession.objects.all().values_list("id", flat=True)
        groups = []

        for sync_session_id in sync_session_ids:
            transfer_sessions = TransferSession.objects.filter(
                sync_session_id=sync_session_id
            )
            transfer_session_filter = Q(
                transfer_session_id__in=transfer_sessions.values_list("pk", flat=True)
            )
            groups.append(
                GroupDeletion(
                    sync_session_id,
                    querysets=[
                        RecordMaxCounterBuffer.objects.filter(transfer_session_filter),
                        Buffer.objects.filter(transfer_session_filter),
                    ],
                )
            )

        return groups
