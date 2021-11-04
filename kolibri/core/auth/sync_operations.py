import json
import logging

from morango.constants import transfer_stages
from morango.sync.operations import BaseOperation
from morango.sync.operations import LocalOperation

from .sync_event_hook_utils import get_other_side_kolibri_version
from .sync_event_hook_utils import get_user_id_for_single_user_sync
from .sync_event_hook_utils import other_side_using_single_user_cert
from .sync_event_hook_utils import this_side_using_single_user_cert
from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.upgrade import matches_version
from kolibri.utils.version import truncate_version


logger = logging.getLogger(__name__)
SORTED_STAGES = sorted(transfer_stages.ALL, key=lambda s: transfer_stages.precedence(s))
PREVIOUS_STAGES = dict(zip(SORTED_STAGES, [None] + SORTED_STAGES[:-1]))


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
        return operations


class KolibriSyncOperationMixin(BaseOperation):
    """
    Mixin for Morango operations to provide structure for handling a context once if the operation
    does have side effects that do that modify the behavior of the sync (returning non-False)
    """

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
