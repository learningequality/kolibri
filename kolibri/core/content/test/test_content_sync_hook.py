import uuid
from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from morango.sync.context import SessionContext

from kolibri.core.auth.models import Facility
from kolibri.core.auth.sync_operations import KolibriSyncOperations
from kolibri.core.content.kolibri_plugin import ContentSyncHook
from kolibri.core.content.kolibri_plugin import (
    NetworkDiscoveryForAutomaticResourceImportHook,
)
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.test.utils.test_content_request import (
    BaseIncompleteDownloadsQuerysetTestCase,
)
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.discovery.models import NetworkLocation


class KolibriContentSyncHookTestCase(BaseIncompleteDownloadsQuerysetTestCase):
    def setUp(self):
        super().setUp()
        self.operation = KolibriSyncOperations()
        self.context = mock.Mock(spec_set=SessionContext)()

    @mock.patch("kolibri.core.content.utils.content_request.StorageCalculator")
    def test_post_transfer_sets_insufficient_storage(self, mock_calc):
        with mock.patch(
            "kolibri.core.content.kolibri_plugin.automatic_download_enabled",
            return_value=True,
        ):
            with mock.patch(
                "kolibri.core.content.utils.content_request.get_free_space_for_downloads",
                return_value=0,
            ):
                self._create_resources(self.admin_request.contentnode_id)
                hook = ContentSyncHook()
                hook.post_transfer(
                    self.facility.dataset_id,
                    True,
                    True,
                    self.learner.id,
                    self.context,
                )
                status = LearnerDeviceStatus.objects.get(user_id=self.learner.id)
                self.assertEqual(
                    (status.status, status.status_sentiment),
                    DeviceStatus.InsufficientStorage,
                )


@mock.patch(
    "kolibri.core.content.kolibri_plugin.get_device_setting", return_value=False
)
@mock.patch("kolibri.core.content.tasks.automatic_resource_import")
class NetworkDiscoveryForAutomaticResourceImportHookTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="a")

    def setUp(self):
        self.peer = NetworkLocation(
            base_url="http://peer.local:8080/", instance_id=uuid.uuid4().hex
        )

    def test_on_connect__source_peer_downloads_stay_backed_off(self, mock_task, _):
        download = ContentDownloadRequest.objects.create(
            reason=ContentRequestReason.SyncInitiated,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility_id=self.facility.id,
            source_instance_id=self.peer.instance_id,
            contentnode_id=uuid.uuid4().hex,
            status=ContentRequestStatus.Failed,
            failure_count=3,
            retry_after=timezone.now() + timedelta(hours=4),
        )

        NetworkDiscoveryForAutomaticResourceImportHook().on_connect(self.peer)

        mock_task.enqueue_if_not_active.assert_not_called()
        download.refresh_from_db()
        self.assertIsNotNone(download.retry_after)
