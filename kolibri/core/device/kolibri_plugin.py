from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.plugins.hooks import register_hook


@register_hook
class UserSyncStatusHook(FacilityDataSyncHook):
    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        # if we're about to do a single user sync, update UserSyncStatus accordingly
        if context.sync_session and single_user_id is not None:
            from kolibri.core.device.models import UserSyncStatus

            UserSyncStatus.objects.update_or_create(
                user_id=single_user_id,
                defaults={"queued": False, "sync_session": context.sync_session},
            )
