import time
from uuid import uuid4

import mock
from django.test import TestCase
from requests.exceptions import ConnectionError

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.public.utils import begin_request_soud_sync
from kolibri.core.public.utils import request_soud_sync


class SyncQueueTestBase(TestCase):
    multi_db = True

    def setUp(self):
        self.facility = Facility.objects.create(name="Test")

    def test_create_queue_element(self):
        previous_time = time.time()
        time.sleep(0.1)
        element, _ = SyncQueue.objects.get_or_create(
            user_id=FacilityUser.objects.create(
                username="test", facility=self.facility
            ).id,
            instance_id=uuid4(),
        )
        time.sleep(0.1)
        assert element.keep_alive == 5.0
        current_time = time.time()
        assert (
            current_time >= element.updated
        )  # = added because sometimes this is too quick
        assert previous_time < element.updated

    def test_queue_cleaning(self):
        for i in range(3):
            SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
        for i in range(3, 5):
            item = SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
            item.updated = item.updated - 200
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # expiry time is 2 * keep_alive value
        assert SyncQueue.objects.count() == 3

    def test_dynamic_queue_cleaning(self):
        for i in range(5):
            item = SyncQueue.objects.create(
                user_id=FacilityUser.objects.create(
                    username="test{}".format(i), facility=self.facility
                ).id,
                instance_id=uuid4(),
            )
            item.updated = item.updated - 20
            if i % 2 == 0:
                item.keep_alive = 30
            item.save()

        assert SyncQueue.objects.count() == 5
        SyncQueue.clean_stale()  # expiry time is 2 * keep_alive value
        assert SyncQueue.objects.count() == 3


class TestRequestSoUDSync(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.test_user = FacilityUser.objects.create(
            username="test", facility=self.facility
        )

    @mock.patch("kolibri.core.public.utils.queue")
    @mock.patch(
        "kolibri.core.public.utils.get_device_setting",
        return_value=True,
    )
    def test_begin_request_soud_sync(self, mock_device_info, queue):
        begin_request_soud_sync("whatever_server", self.test_user.id)
        queue.enqueue.assert_called_with(
            request_soud_sync, "whatever_server", self.test_user.id
        )

    @mock.patch("kolibri.core.public.utils.scheduler")
    @mock.patch("kolibri.core.public.utils.requests")
    @mock.patch("kolibri.core.tasks.api.MorangoProfileController")
    @mock.patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @mock.patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_request_soud_sync(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        scheduler,
    ):

        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.json.return_value = {"action": SYNC}

        network_connection = mock.Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)
        self.assertEqual(scheduler.enqueue_in.call_count, 0)

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.json.return_value = {
            "action": QUEUED,
            "keep_alive": "5",
            "id": str(uuid4()),
        }
        request_soud_sync("whatever_server", self.test_user.id)
        self.assertEqual(scheduler.enqueue_in.call_count, 1)

    @mock.patch("kolibri.core.public.utils.scheduler")
    @mock.patch("kolibri.core.public.utils.requests")
    @mock.patch("kolibri.core.tasks.api.MorangoProfileController")
    @mock.patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @mock.patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_request_soud_sync_server_error(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        scheduler,
    ):

        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.return_value.status_code = 500

        network_connection = mock.Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)

        self.assertEqual(scheduler.enqueue_in.call_count, 1)

    @mock.patch("kolibri.core.public.utils.scheduler")
    @mock.patch("kolibri.core.public.utils.requests")
    @mock.patch("kolibri.core.tasks.api.MorangoProfileController")
    @mock.patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @mock.patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_request_soud_sync_connection_error(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        scheduler,
    ):

        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.side_effect = ConnectionError

        network_connection = mock.Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)

        self.assertEqual(scheduler.enqueue_in.call_count, 1)
