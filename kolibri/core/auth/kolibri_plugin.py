import logging
import uuid

from morango.sync.operations import LocalOperation

from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Session
from kolibri.core.auth.sync_operations import KolibriLocalInitializeOperation
from kolibri.core.auth.sync_operations import KolibriNetworkInitializeOperation
from kolibri.core.auth.sync_operations import KolibriSingleUserSyncOperation
from kolibri.core.auth.sync_operations import KolibriSyncOperationMixin
from kolibri.core.auth.sync_operations import PicturePasswordCollisionOperation
from kolibri.core.auth.tasks import cleanupsync
from kolibri.core.auth.utils.picture_passwords import are_picture_passwords_exhausted
from kolibri.core.auth.utils.picture_passwords import assign_picture_password
from kolibri.core.auth.utils.picture_passwords import get_learner_count
from kolibri.plugins.hooks import register_hook

logger = logging.getLogger(__name__)


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


def cleanup_sessions(user_ids):
    """
    Clean up sessions for all hard and soft-deleted users in the synced dataset.

    :type dataset_id: str
    """

    all_user_ids = set(user_ids)

    # Query all soft-deleted users in this dataset
    still_active_users = set(
        FacilityUser.objects.filter(id__in=user_ids).values_list("id", flat=True)
    )
    user_ids_to_delete = all_user_ids - still_active_users

    # Clean up sessions for these users
    if user_ids_to_delete:
        Session.delete_all_sessions(user_ids_to_delete)


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
                instance_kwargs["client_instance_id"] = (
                    context.sync_session.client_instance_id
                )
            else:
                instance_kwargs["server_instance_id"] = (
                    context.sync_session.server_instance_id
                )

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
    initializing_operations = [
        KolibriLocalInitializeOperation(),
        KolibriNetworkInitializeOperation(),
    ]
    serializing_operations = [SingleFacilityUserChangeClearingOperation()]
    deserializing_operations = [PicturePasswordCollisionOperation()]
    cleanup_operations = [CleanUpTaskOperation()]

    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        if context.is_receiver:
            user_ids = context.transfer_session.get_touched_record_ids_for_model(
                FacilityUser
            )
            cleanup_sessions(user_ids)


@register_hook
class PicturePasswordsSyncHook(FacilityDataSyncHook):
    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        if not context.is_receiver:
            return

        get_learner_count.clear(dataset_id)

        if local_is_single_user:
            return

        dataset = FacilityDataset.objects.get(id=dataset_id)
        if dataset.picture_password_settings is None:
            return

        if are_picture_passwords_exhausted(dataset_id):
            return

        facility = Facility.objects.get(dataset_id=dataset_id)
        learners = FacilityUser.objects.filter(
            dataset_id=dataset_id,
            roles__isnull=True,
            picture_password__isnull=True,
        ).exclude(devicepermissions__is_superuser=True)

        for user in learners.iterator():
            try:
                assign_picture_password(user, facility)
            except NoAvailableSequences:
                logger.error("No available picture password sequences remaining.")
                break
