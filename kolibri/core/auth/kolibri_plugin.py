from morango.sync.operations import LocalOperation

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.sync_operations import KolibriSingleUserSyncOperation
from kolibri.core.auth.sync_operations import KolibriSyncOperationMixin
from kolibri.core.auth.tasks import cleanupsync
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


class CleanUpTaskOperation(KolibriSyncOperationMixin, LocalOperation):
    def handle_initial(self, context):
        if context.is_receiver:
            is_pull = context.is_pull
            is_push = context.is_push
            sync_filter = str(context.filter)
            is_server = context.is_server
            instance_id = str(
                context.sync_session.client_instance_id
                if context.is_server
                else context.sync_session.server_instance_id
            )
            instance_name = "client" if is_server else "server"
            cleanupsync.enqueue(
                kwargs=dict(
                    is_pull=is_pull,
                    is_push=is_push,
                    sync_filter=sync_filter,
                    is_server=is_server,
                    instance_id=instance_id,
                    instance_name=instance_name
                )
            )
        return False


@register_hook
class AuthSyncHook(FacilityDataSyncHook):
    serializing_operations = [SingleFacilityUserChangeClearingOperation()]
    cleanup_operations = [CleanUpTaskOperation()]
