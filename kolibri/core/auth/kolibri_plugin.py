import uuid

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
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        from kolibri.core.device.utils import device_provisioned

        if context.is_receiver and device_provisioned():
            pull = context.is_pull
            push = context.is_push
            sync_filter = str(context.filter)

            instance_kwargs = {}
            if context.is_server:
                instance_kwargs[
                    "client_instance_id"
                ] = context.sync_session.client_instance_id
            else:
                instance_kwargs[
                    "server_instance_id"
                ] = context.sync_session.server_instance_id

            # ensure the instance ids are strings
            for key, instance_id in instance_kwargs.items():
                if isinstance(instance_id, uuid.UUID):
                    instance_kwargs[key] = instance_id.hex

            cleanupsync.enqueue(
                kwargs=dict(
                    pull=pull, push=push, sync_filter=sync_filter, **instance_kwargs
                )
            )

        return False


@register_hook
class AuthSyncHook(FacilityDataSyncHook):
    serializing_operations = [SingleFacilityUserChangeClearingOperation()]
    cleanup_operations = [CleanUpTaskOperation()]
