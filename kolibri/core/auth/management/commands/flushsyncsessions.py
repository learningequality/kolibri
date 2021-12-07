import logging
from datetime import timedelta

from dateutil.parser import isoparse
from django.db.models import Q
from django.utils import timezone
from morango.models import Buffer
from morango.models import RecordMaxCounterBuffer
from morango.models import SyncSession
from morango.models import TransferSession

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.utils.delete import GroupDeletion
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    help = "This command initiates the deletion process for temporary sync session buffers."

    def add_arguments(self, parser):
        default_date = timezone.now() - timedelta(days=1)
        parser.add_argument("--noninteractive", action="store_true")
        parser.add_argument(
            "--before-date",
            type=str,
            default=default_date.isoformat(),
            help="Filter sync sessions with last activity before this ISO 8601 timestamp",
        )

    def handle_async(self, *args, **options):
        noninteractive = options["noninteractive"]
        before_date = options["before_date"]

        before_datetime = (
            isoparse(before_date) if before_date != "now" else timezone.now()
        )

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to delete all sync session buffers before {}?".format(
                    before_datetime.isoformat()
                )
            )

        sync_sessions = SyncSession.objects.filter(
            last_activity_timestamp__lt=before_datetime
        )
        groups, sync_session_ids = self._get_delete_groups(sync_sessions)
        delete_group = GroupDeletion("Main", sleep=1, groups=groups)

        # run the counting step
        with self.start_progress(total=delete_group.group_count()) as update_progress:
            update_progress(increment=0, message="Counting database objects")
            total_count = delete_group.count(update_progress)

        # no the deleting step
        with self.start_progress(total=total_count) as update_progress:
            update_progress(increment=0, message="Deleting database objects")
            delete_group.delete(update_progress)

        # lastly, mark them all inactive
        sync_sessions.filter(active=True).update(active=False)
        TransferSession.objects.filter(
            sync_session_id__in=sync_session_ids, active=True
        ).update(active=False)

        logger.info("Deletion complete.")

    def _get_delete_groups(self, sync_sessions):
        sync_session_ids = sync_sessions.values_list("id", flat=True)
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

        return groups, sync_session_ids
