import logging

from morango.sync.operations import LocalOperation

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_event_hook_utils import get_dataset_id
from kolibri.core.auth.sync_event_hook_utils import get_user_id_for_single_user_sync
from kolibri.core.auth.sync_operations import KolibriSyncOperationMixin
from kolibri.core.content.tasks import automatic_resource_import
from kolibri.core.content.utils.content_request import synchronize_content_requests
from kolibri.plugins.hooks import register_hook
from kolibri.utils import conf


logger = logging.getLogger(__name__)


class ContentRequestsOperation(KolibriSyncOperationMixin, LocalOperation):
    """
    Generates `ContentRequest` models after a sync has completed
    """

    # this needs to be lower than the priority of `SingleUserLessonCleanupOperation` and
    # `SingleUserExamCleanupOperation`
    priority = 5

    def handle_initial(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        from kolibri.core.device.utils import get_device_setting
        from kolibri.core.device.utils import device_provisioned

        # only needs to synchronize requests when on receiving end of a sync
        self._assert(context.is_receiver)

        is_subset_of_users = get_device_setting("subset_of_users_device", False) or (
            # if we're in setup flow for LOD, then this would be the case
            not device_provisioned()
            and get_user_id_for_single_user_sync(context)
        )
        # either the device is a SoUD or the options.ini setting needs enabled to allow this
        self._assert(
            is_subset_of_users
            or conf.OPTIONS["Deployment"]["SYNC_INITIATED_CONTENT_IMPORT"]
        )

        dataset_id = get_dataset_id(context)
        logger.info(
            "Processing content requests for synced dataset: {}".format(dataset_id)
        )
        synchronize_content_requests(dataset_id, context.transfer_session)
        logger.info(
            "Completed content requests for synced dataset: {}".format(dataset_id)
        )
        automatic_resource_import.enqueue()
        return False


@register_hook
class ContentSyncHook(FacilityDataSyncHook):
    cleanup_operations = [ContentRequestsOperation()]
