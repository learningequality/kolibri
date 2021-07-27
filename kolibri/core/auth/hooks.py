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
