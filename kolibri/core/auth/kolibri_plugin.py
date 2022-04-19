from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.sync_operations import KolibriSingleUserSyncOperation
from kolibri.plugins.hooks import register_hook


class SingleFacilityUserChangeClearingOperation(KolibriSingleUserSyncOperation):
    def handle_local_user(self, context, user_id):
        # If this is a single-user device, make sure we ignore any changes
        # that have been made to FacilityUsers, to avoid conflicts.
        try:
            user = FacilityUser.objects.get(id=user_id, _morango_dirty_bit=True)
            user.save(update_dirty_bit_to=False)
        except FacilityUser.DoesNotExist:
            pass
        return False


@register_hook
class AuthSyncHook(FacilityDataSyncHook):
    serializing_operations = [SingleFacilityUserChangeClearingOperation()]
