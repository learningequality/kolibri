import logging

from morango.sync.operations import LocalOperation

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_event_hook_utils import get_dataset_id
from kolibri.core.auth.sync_operations import KolibriSyncOperationMixin
from kolibri.core.content.tasks import enqueue_automatic_resource_import_if_needed
from kolibri.core.content.utils.content_request import incomplete_downloads_queryset
from kolibri.core.content.utils.content_request import process_metadata_import
from kolibri.core.content.utils.content_request import StorageCalculator
from kolibri.core.content.utils.content_request import synchronize_content_requests
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.hooks import NetworkLocationDiscoveryHook
from kolibri.plugins.hooks import register_hook


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
        from kolibri.core.content.utils.settings import automatic_download_enabled

        # only needs to synchronize requests when on receiving end of a sync
        self._assert(context.is_receiver)

        # either the device setting is enabled, or we haven't provisioned yet. If the device isn't
        # provisioned, we allow this because the default will be True after provisioning
        self._assert(automatic_download_enabled())

        dataset_id = get_dataset_id(context)
        logger.info(
            "Processing content requests for synced dataset: {}".format(dataset_id)
        )
        synchronize_content_requests(dataset_id, context.transfer_session)
        logger.info(
            "Completed content requests for synced dataset: {}".format(dataset_id)
        )
        return False


@register_hook
class ContentSyncHook(FacilityDataSyncHook):
    cleanup_operations = [ContentRequestsOperation()]

    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        """
        Processes content import using the post_transfer hook, outside of the sync process, but
        between push and pulls (since this processes when receiving)
        """
        from kolibri.core.content.utils.settings import automatic_download_enabled

        # only process upon receiving
        if not context.is_receiver or not automatic_download_enabled():
            return

        # process metadata import for new requests without metadata
        incomplete_downloads = incomplete_downloads_queryset()
        incomplete_downloads_without_metadata = incomplete_downloads.filter(
            has_metadata=False,
        )
        if incomplete_downloads_without_metadata.exists():
            process_metadata_import(incomplete_downloads_without_metadata)

        calc = StorageCalculator(incomplete_downloads)
        if local_is_single_user and not calc.is_space_sufficient():
            LearnerDeviceStatus.save_learner_status(
                single_user_id, DeviceStatus.InsufficientStorage
            )

        enqueue_automatic_resource_import_if_needed()


@register_hook
class NetworkDiscoveryForAutomaticResourceImportHook(NetworkLocationDiscoveryHook):
    """
    Trigger automatic resource import when a new Kolibri instance is discovered, but only if
    the local and remote devices are not a subset of the users device. If we're a SoUD, then
    we would trigger automatic syncing which would trigger automatic resource import anyway
    (see above hook).
    """

    def on_connect(self, network_location):
        """
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        if (
            not get_device_setting("subset_of_users_device")
            and not network_location.subset_of_users_device
        ):
            enqueue_automatic_resource_import_if_needed(
                instance_id=network_location.instance_id
            )
