from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class FacilityDataSyncHook(KolibriHook):
    """
    A hook to allow plugins to register callbacks for sync events they're interested in.

    There are two options for hooking into sync: the *_transfer hooks and sync operations.
    - Errors raised in the pre_transfer and post_transfer hooks will not cause sync to fail, so use
      them for behaviors that are auxiliary to the integrity of the sync.
    - Errors raised in operations will cause the sync to fail, so use them for behaviors that are
      vital to the sync process.
    """

    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        """
        Invoked at the completion of initialization stage
        :type dataset_id: str
        :type local_is_single_user: bool
        :type remote_is_single_user: bool
        :type single_user_id: str
        :type context: morango.sync.context.LocalSessionContext
        """
        pass

    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        """
        Invoked at the completion of cleanup stage
        :type dataset_id: str
        :type local_is_single_user: bool
        :type remote_is_single_user: bool
        :type single_user_id: str
        :type context: morango.sync.context.LocalSessionContext
        """
        pass

    def get_sync_operations(self, context):
        """
        Allows for customized runtime behavior of syncs by providing a way to inject operations into
        sync during the process. By default this will return the value of an attribute that matches
        the current stage of the context. Define any of the following to provide custom operations:
            initializing_operations
            serializing_operations
            queuing_operations
            transferring_operations
            dequeuing_operations
            deserializing_operations
            cleanup_operations

        :type context: morango.sync.context.SessionContext
        :return: A list of callable functions or Morango operations
        :rtype: callable[]|morango.sync.operations.BaseOperation[]
        """
        return getattr(self, "{}_operations".format(context.stage), [])
