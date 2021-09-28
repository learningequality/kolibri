from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.models import FacilityUser
from kolibri.plugins.hooks import register_hook


@register_hook
class SingleFacilityUserChangeClearingHook(FacilityDataSyncHook):
    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):

        # If this is a single-user device, make sure we ignore any changes
        # that have been made to FacilityUsers, to avoid conflicts.
        if local_is_single_user and single_user_id is not None:
            try:
                user = FacilityUser.objects.get(
                    id=single_user_id, _morango_dirty_bit=True
                )
                user.save(update_dirty_bit_to=False)
            except FacilityUser.DoesNotExist:
                pass
