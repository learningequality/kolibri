import time

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_event_hook_utils import get_dataset_id
from kolibri.core.auth.sync_event_hook_utils import get_user_id_for_single_user_sync
from kolibri.core.auth.sync_operations import KolibriVersionedSyncOperation
from kolibri.core.utils.lock import retry_on_db_lock
from kolibri.plugins.hooks import register_hook


@register_hook
class SyncQueueStatusHook(FacilityDataSyncHook):
    @retry_on_db_lock
    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        # if we're about to do a single user sync, update SyncQueue status accordingly
        if context.sync_session and single_user_id is not None:
            from kolibri.core.device.models import SyncQueueStatus
            from kolibri.core.device.models import SyncQueue

            instance_id = (
                context.sync_session.client_instance_id
                if context.is_server
                else context.sync_session.server_instance_id
            )
            SyncQueue.objects.update_or_create(
                user_id=single_user_id,
                instance_id=instance_id,
                defaults={
                    "status": SyncQueueStatus.Syncing,
                    "sync_session_id": context.sync_session.id,
                    "updated": time.time(),
                },
            )

    @retry_on_db_lock
    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        # if we're concluding a single user sync, update SyncQueue status accordingly
        if context.sync_session and single_user_id is not None:
            from kolibri.core.device.models import SyncQueueStatus
            from kolibri.core.device.models import SyncQueue

            instance_id = (
                context.sync_session.client_instance_id
                if context.is_server
                else context.sync_session.server_instance_id
            )
            SyncQueue.objects.update_or_create(
                user_id=single_user_id,
                instance_id=instance_id,
                defaults={
                    "status": SyncQueueStatus.Pending,
                    "updated": time.time(),
                    "last_sync": time.time(),
                },
            )


class LearnerDeviceStatusOperation(KolibriVersionedSyncOperation):
    version = "0.16.2"

    def downgrade(self, context):
        """
        Delete LearnerDeviceStatus records that might cause an issue when syncing to a previous version.
        For a single user sync, delete any learner device statuses associated with the single user.
        For a facility sync, delete all learner device statuses for the facility.
        :type context: morango.sync.context.LocalSessionContext
        """
        from kolibri.core.device.models import LearnerDeviceStatus

        # get the user_id for the single user sync
        # if it's not a single user sync, this will be None
        user_id = get_user_id_for_single_user_sync(context)

        # get the instance_id of the remote instance
        instance_id = (
            context.sync_session.client_instance_id
            if context.is_server
            else context.sync_session.server_instance_id
        )

        queryset = LearnerDeviceStatus.objects.exclude(instance_id=instance_id)

        if user_id is not None:
            queryset.filter(user=user_id).delete()
        else:
            dataset_id = get_dataset_id(context)
            queryset.filter(user__dataset_id=dataset_id).delete()


@register_hook
class LearnerDeviceStatusHook(FacilityDataSyncHook):
    initializing_operations = [LearnerDeviceStatusOperation()]
