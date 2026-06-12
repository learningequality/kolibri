import json
import logging

from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store
from morango.models.certificates import Filter
from morango.sync.operations import _deserialize_from_store
from morango.sync.operations import BaseOperation
from morango.sync.operations import InitializeOperation
from morango.sync.operations import LocalOperation
from morango.sync.operations import NetworkInitializeOperation
from morango.sync.operations import ReceiverDeserializeOperation

from kolibri.core.auth.constants.picture_passwords import PICTURE_PASSWORD_SET
from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.picture_passwords import are_picture_passwords_exhausted
from kolibri.core.auth.utils.picture_passwords import get_all_valid_sequences
from kolibri.core.auth.utils.picture_passwords import get_assigned_sequences
from kolibri.core.auth.utils.sync import ClassroomPartitionFilterFactory
from kolibri.core.upgrade import matches_version
from kolibri.utils.version import truncate_version

from .sync_event_hook_utils import get_dataset_id
from .sync_event_hook_utils import get_other_side_kolibri_version
from .sync_event_hook_utils import get_user_id_for_single_user_sync
from .sync_event_hook_utils import other_side_using_single_user_cert
from .sync_event_hook_utils import this_side_using_single_user_cert

logger = logging.getLogger(__name__)
SORTED_STAGES = sorted(transfer_stages.ALL, key=lambda s: transfer_stages.precedence(s))
PREVIOUS_STAGES = dict(zip(SORTED_STAGES, [None] + SORTED_STAGES[:-1]))


class KolibriLocalInitializeOperation(InitializeOperation):
    """
    Operation for initializing a local sync session. Specifically, this adds functionality to
    dynamically add filters to a sync when this device is the server during a sync. This
    functionality could be accomplished by simply adding another operation in the chain before the
    already extant `InitializeOperation` (which this inherits). Although, since this is important
    functionality to Kolibri, and Kolibri already has plugins which modify the sync behavior, it's
    more foolproof to inherit the operation to ensure this functionality is coupled with
    initialization.
    """

    def handle(self, context):
        """
        Dynamically adds partition filters when one device in the sync is a SoUD (see similar
        logic in other extant hooks and operations), for syncing classroom partitioned records.

        :param context: The sync context object containing session and filter information.
        :type context: morango.sync.context.LocalSessionContext
        """
        # the server validates that a sync filter is allowed within the certificate's scope, and
        # since the client initiates the sync, we can't add the dynamic classroom filter to the
        # context until after the transfer session has been validated. this sync operation will
        # be invoked before validation on the client, and after validation on the server
        if context.is_server:
            is_local = this_side_using_single_user_cert(context)
            is_remote = other_side_using_single_user_cert(context)

            # server is a full facility device, but syncing with a SoUD, therefore the device has
            # the 'authority' to dynamically add the classroom partition filter
            if not is_local and is_remote:
                filter_factory = ClassroomPartitionFilterFactory(
                    get_dataset_id(context)
                )
                single_user_id = get_user_id_for_single_user_sync(context)

                # when it's a push, since this code block is restricted to the server, the
                # client's partition filter should be restricted to what is explicitly read/write,
                # otherwise the user can pull any data for the classroom partition
                dynamic_filter = filter_factory.set_writeable(
                    writeable=context.is_push
                ).build_for_user(single_user_id)

                if dynamic_filter:
                    context.update(
                        sync_filter=Filter.add(context.filter, dynamic_filter)
                    )

        return super().handle(context)


class KolibriNetworkInitializeOperation(NetworkInitializeOperation):
    """
    Operation for initializing a sync session with a remote over the network. This specifically adds
    functionality to handle the result of the above operation that dynamically adds filters.
    """

    def create_transfer_session(self, context):
        """
        Calls the super method which makes a network request to create a transfer session, then
        updates the local transfer session filters to match the remote's using the response.

        :param context: The sync context object containing session and filter information.
        :type context: morango.sync.context.NetworkSessionContext
        :return: The response dictionary from the remote
        :rtype: dict
        """
        response_data = super().create_transfer_session(context)

        is_local = this_side_using_single_user_cert(context)
        is_remote = other_side_using_single_user_cert(context)

        response_filter = (
            Filter(response_data["filter"])
            if response_data.get("filter", None)
            else None
        )

        # TODO: morango's sync Filter needs defensiveness against comparing with `None`
        if (
            is_local
            and not is_remote
            and response_filter is not None
            and response_filter != context.filter
        ):
            # receive the modified, dynamic, filter(s) from the server and update the transfer
            # session and context objects to reflect the change
            context.update(sync_filter=response_filter)
            context.transfer_session.filter = str(response_filter)
            context.transfer_session.save()

        return response_data


class KolibriSyncOperations(BaseOperation):
    """
    Proxy class for Morango sync operations which allows customized behavior through Kolibri plugins
    """

    def handle(self, context):
        """
        Kolibri plugins can register transfer operations to alter the behavior of the sync. The
        operations have more control over the sync process, such as blocking it or bypassing
        certain aspects.

        :type context: morango.sync.context.SessionContext
        :return: False or transfer stage status
        """
        # execute operations which can decide to block or resolve the transfer stage
        for operation in self.get_operations(context):
            result = operation(context)
            # operation tells us it has "handled" the context by returning result that is not False
            if result is not False:
                return result

        # return False, which tells Morango to keep processing Operations
        return False

    def get_operations(self, context):
        """
        :type context: morango.sync.context.SessionContext
        :return: list of callables
        """
        operations = []
        # we'll execute the operations in the order of the registered hooks
        for hook in FacilityDataSyncHook.registered_hooks:
            # pass the context so the hook can decide what operations should be executed at this
            # stage of the transfer, but by default it looks for an attribute that matches the
            # current stage
            operations.extend(hook.get_sync_operations(context))

        # finally, sort operations by priority (higher is first)
        return sorted(operations, reverse=True, key=lambda o: getattr(o, "priority", 0))


class KolibriSyncOperationMixin(BaseOperation):
    """
    Mixin for Morango operations to provide structure for handling a context once if the operation
    does have side effects that do that modify the behavior of the sync (returning non-False)
    """

    priority = 0
    """Priority integer for ordering operations relative to others"""

    @property
    def history_key(self):
        """
        The string key used for retaining state information about this operation occurring
        :return:
        """
        return self.__class__.__name__

    def _get_storage(self, context):
        """
        :type context: morango.sync.context.SessionContext
        :return: A dict representing the "storage" available for retaining state
        """
        context.sync_session.refresh_from_db(fields=["extra_fields"])
        return json.loads(context.sync_session.extra_fields or "{}")

    def _update_storage(self, context, storage):
        """
        :type context: morango.sync.context.SessionContext
        :param storage: A dict with changes to update storage with
        """
        extra_fields = self._get_storage(context)
        extra_fields.update(**storage)
        context.sync_session.extra_fields = json.dumps(extra_fields)
        context.sync_session.save()

    def has_handled(self, context):
        """
        Override to determine whether `handle_initial` or `handle_subsequent` should be invoked,
        otherwise this will use extra fields of the sync session to determine that

        :type context: morango.sync.context.SessionContext
        :return: A boolean
        """
        storage = self._get_storage(context)
        key = "{}:{}".format(context.transfer_session.id, context.stage)
        return key in storage.get(self.history_key, [])

    def mark_handled(self, context):
        """
        Mark the operation as handled initially so `handle_subsequent` will be called subsequently

        :type context: morango.sync.context.SessionContext
        """
        operation_history = self._get_storage(context).get(self.history_key, [])
        operation_history.append(
            "{}:{}".format(context.transfer_session.id, context.stage)
        )
        self._update_storage(context, {self.history_key: operation_history})

    def handle(self, context):
        """
        :type context: morango.sync.context.SessionContext
        :return: False or transfer status
        """
        # this requires the transfer session to create a state for this context
        self._assert(context.transfer_session is not None)
        if not self.has_handled(context):
            result = self.handle_initial(context)
            self.mark_handled(context)
            return result
        return self.handle_subsequent(context)

    def handle_initial(self, context):
        """
        Invoked on the first call to the stage's operations for the context, but will not be
        re-invoked if stage operations are re-executed
        :param context: morango.sync.context.SessionContext
        :return: False or transfer status
        """
        return False

    def handle_subsequent(self, context):
        """
        Invoked on the subsequent calls to the stage's operations after the first invocation for
        the context
        :param context: morango.sync.context.SessionContext
        :return: False or transfer status
        """
        return False


class KolibriVersionedSyncOperation(KolibriSyncOperationMixin, LocalOperation):
    """
    Morango operation class to handle migrating data to and from other versions, assuming we're
    handling it as the newer instance
    """

    version = None

    @property
    def version_threshold(self):
        return "<{}".format(self.version)

    def handle_initial(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        :return: False
        """
        self._assert(self.version is not None)

        # get the kolibri version, which is defined in
        # kolibri.core.auth.constants.morango_sync:CUSTOM_INSTANCE_INFO
        remote_version = get_other_side_kolibri_version(context)

        # pre-0.15.0 won't have the kolibri version
        if remote_version is None or matches_version(
            truncate_version(remote_version), self.version_threshold
        ):
            if context.is_receiver:
                self.upgrade(context)
            else:
                self.downgrade(context)

        return False

    def upgrade(self, context):
        """
        Called when we're receiving data from a version older than `self.version`

        :type context: morango.sync.context.LocalSessionContext
        """
        pass

    def downgrade(self, context):
        """
        Called when we're producing data for a version older than `self.version`

        :type context: morango.sync.context.LocalSessionContext
        """
        pass


class KolibriSingleUserSyncOperation(KolibriSyncOperationMixin, LocalOperation):
    """
    Morango operation to handle single-user/learner-only related operations
    """

    def handle_initial(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        :return:
        """
        is_local = this_side_using_single_user_cert(context)
        is_remote = other_side_using_single_user_cert(context)
        self._assert(is_local != is_remote)

        user_id = get_user_id_for_single_user_sync(context)

        # because of previous assert, it's either local or remote by this point
        if is_local:
            return self.handle_local_user(context, user_id)
        return self.handle_remote_user(context, user_id)

    def handle_local_user(self, context, user_id):
        """
        Called when the user resides locally
        :type context: morango.sync.context.LocalSessionContext
        :param user_id: The user ID of the single-user
        :return: False or transfer status
        """
        return False

    def handle_remote_user(self, context, user_id):
        """
        Called when the user resides remotely
        :type context: morango.sync.context.LocalSessionContext
        :param user_id: The user ID of the single-user
        :return: False or transfer status
        """
        return False


_INTEGRITY_ERROR_EXCEPTION = "django.db.utils.IntegrityError"


class PicturePasswordCollisionOperation(ReceiverDeserializeOperation):
    """
    Resolves picture_password unique_together violations that occur when two devices
    independently assign the same picture password to different learners and then sync.

    Runs after normal deserialization (priority=-1), inspects broken Store records, reassigns
    the conflicting local FacilityUser to a new password, clears the Store error state, and
    retries deserialization so the incoming record lands cleanly.
    """

    priority = -1

    def handle(self, context):
        self._assert(context.sync_session is not None)
        self._assert(context.transfer_session is not None)
        self._assert(context.filter is not None)
        self._assert(context.is_receiver)

        result = super().handle(context)

        if result != transfer_statuses.COMPLETED:
            return result

        dataset_id = get_dataset_id(context)

        broken_stores = Store.objects.filter(
            partition__startswith=dataset_id,
            model_name=FacilityUser.morango_model_name,
            dirty_bit=True,
            deserialization_exception=_INTEGRITY_ERROR_EXCEPTION,
            last_transfer_session_id=context.transfer_session.id,
        )

        conflicting_passwords = {
            json.loads(serialized).get("picture_password")
            for serialized in broken_stores.values_list("serialized", flat=True)
        } - {None, ""}

        if not conflicting_passwords:
            return transfer_statuses.COMPLETED

        local_users = list(
            FacilityUser.objects.filter(
                dataset_id=dataset_id,
                picture_password__in=conflicting_passwords,
            )
        )

        if not local_users:
            return transfer_statuses.COMPLETED

        if are_picture_passwords_exhausted(dataset_id):
            available_sequences = []
        else:
            facility = Facility.objects.get(dataset_id=dataset_id)
            available_sequences = list(
                get_all_valid_sequences(PICTURE_PASSWORD_SET)
                - get_assigned_sequences(facility)
            )

        for local_user in local_users:
            local_user.picture_password = (
                available_sequences.pop() if available_sequences else None
            )
            local_user.save()

        broken_store_ids = broken_stores.values_list("id", flat=True)

        DeletedModels.objects.filter(id__in=broken_store_ids).delete()
        HardDeletedModels.objects.filter(id__in=broken_store_ids).delete()

        broken_stores.update(
            deserialization_error=None,
            deserialization_exception=None,
        )

        _deserialize_from_store(context.sync_session.profile, filter=context.filter)

        return transfer_statuses.COMPLETED
