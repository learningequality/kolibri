from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class FacilityDataSyncHook(KolibriHook):
    """
    A hook to allow plugins to register callbacks for sync events they're interested in.
    """

    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        pass

    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        pass

    def get_sync_operations(self, context):
        """
        :type context: morango.sync.context.SessionContext
        :return: A list of callable functions or Morango operations
        :rtype: callable|morango.sync.operations.BaseOperation
        """
        return getattr(self, "{}_operations".format(context.stage), [])
