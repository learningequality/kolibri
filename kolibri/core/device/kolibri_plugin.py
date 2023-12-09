import time

from kolibri.core.auth.hooks import FacilityDataSyncHook
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
