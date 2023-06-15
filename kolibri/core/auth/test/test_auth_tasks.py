import datetime
from uuid import uuid4

from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from mock import MagicMock
from mock import Mock
from mock import patch
from requests.exceptions import ConnectionError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APITestCase

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import begin_request_soud_sync
from kolibri.core.auth.tasks import PeerFacilityImportJobValidator
from kolibri.core.auth.tasks import PeerFacilitySyncJobValidator
from kolibri.core.auth.tasks import request_soud_sync
from kolibri.core.auth.tasks import SyncJobValidator
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.tasks.job import Job


DUMMY_PASSWORD = "password"

fake_job_defaults = dict(
    job_id=None,
    facility_id=None,
    state=None,
    exception="",
    traceback="",
    percentage_progress=0,
    cancellable=False,
    args=(),
    kwargs={},
    extra_metadata={},
    func="",
)


def fake_job(**kwargs):
    fake_data = fake_job_defaults.copy()
    fake_data.update(kwargs)
    return Mock(spec=Job, **fake_data)


class dummy_orm_job_data(object):
    scheduled_time = datetime.datetime(year=2023, month=1, day=1, tzinfo=None)
    repeat = 5
    interval = 8600
    retry_interval = 5


@patch("kolibri.core.tasks.api.job_storage")
class FacilityTasksAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        DeviceSettings.objects.create(is_provisioned=True)
        cls.facility = Facility.objects.create(name="facility")
        cls.superuser = FacilityUser.objects.create(
            username="superuser", facility=cls.facility
        )
        cls.superuser.set_password(DUMMY_PASSWORD)
        cls.superuser.save()
        DevicePermissions.objects.create(user=cls.superuser, is_superuser=True)

    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def assertJobResponse(self, job_data, response):
        id = job_data.get("job_id", fake_job_defaults.get("job_id"))
        self.assertEqual(id, response.data.get("id"))

        status = job_data.get("state", fake_job_defaults.get("state"))
        self.assertEqual(status, response.data.get("status"))

        exception = job_data.get("exception", fake_job_defaults.get("exception"))
        self.assertEqual(exception, response.data.get("exception"))

        traceback = job_data.get("traceback", fake_job_defaults.get("traceback"))
        self.assertEqual(traceback, response.data.get("traceback"))

        percentage = job_data.get(
            "percentage_progress", fake_job_defaults.get("percentage_progress")
        )
        self.assertEqual(percentage, response.data.get("percentage"))

        cancellable = job_data.get("cancellable", fake_job_defaults.get("cancellable"))
        self.assertEqual(cancellable, response.data.get("cancellable"))

        cancellable = job_data.get("cancellable", fake_job_defaults.get("cancellable"))
        self.assertEqual(cancellable, response.data.get("cancellable"))

        extra = job_data.get("extra_metadata", fake_job_defaults.get("extra_metadata"))

        self.assertEqual(extra, response.data.get("extra_metadata"))

    def test_list_unprovisioned(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = []
        response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_provisioned(self, mock_job_storage):
        response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)

    def test_startdataportalsync(self, mock_job_storage):
        mock_job_storage.enqueue_job.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        mock_job_storage.get_job.return_value = fake_job(**fake_job_data)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "facility": self.facility.id,
                "facility_name": "my facility name",
                "type": "kolibri.core.auth.tasks.dataportalsync",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[0][0][0].kwargs,
            dict(
                facility=self.facility.id,
                chunk_size=200,
                noninteractive=True,
                sync_session_id=None,
            ),
        )

    def test_startdataportalbulksync(self, mock_job_storage):
        facility2 = Facility.objects.create(name="facility 2")
        facility3 = Facility.objects.create(name="facility 3")
        dataset_ids = [facility2.dataset_id, facility3.dataset_id]
        FacilityDataset.objects.filter(pk__in=dataset_ids).update(registered=True)

        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        mock_job_storage.get_job.return_value = fake_job(**fake_job_data)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            [
                {
                    "facility": facility.id,
                    "type": "kolibri.core.auth.tasks.dataportalsync",
                }
                for facility in [facility2, facility3]
            ],
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(2, mock_job_storage.enqueue_job.call_count)

        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[0][0][0].kwargs,
            dict(
                facility=facility2.id,
                chunk_size=200,
                noninteractive=True,
                sync_session_id=None,
            ),
        )
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[1][0][0].kwargs,
            dict(
                facility=facility3.id,
                chunk_size=200,
                noninteractive=True,
                sync_session_id=None,
            ),
        )

    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.tasks.validate_and_create_sync_credentials")
    def test_startpeerfacilityimport(
        self,
        validate_and_create_sync_credentials,
        NetworkClient,
        mock_job_storage,
    ):
        device = NetworkLocation.objects.create(
            device_name="test device", base_url="https://some.server.test/extra/stuff"
        )
        extra_metadata = dict(
            facility=self.facility.id,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            facility_name="",
            device_name="",
            device_id="",
            baseurl="https://some.server.test/extra/stuff",
        )

        mock_job_storage.enqueue_job.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        mock_job_storage.get_job.return_value = fake_job(**fake_job_data)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        req_data = dict(
            facility=self.facility.id,
            type="kolibri.core.auth.tasks.peerfacilityimport",
            username="testuser",
            password="testpass",
            device_id=device.id,
        )

        network_client = NetworkClient.build_for_address.return_value
        network_client.base_url = "https://some.server.test/"

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[0][0][0].kwargs,
            dict(
                baseurl="https://some.server.test/",
                facility=self.facility.id,
                no_push=True,
                no_provision=True,
                chunk_size=200,
                noninteractive=True,
                sync_session_id=None,
            ),
        )

    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.tasks.validate_and_create_sync_credentials")
    def test_startpeerfacilitysync(
        self,
        validate_and_create_sync_credentials,
        NetworkClient,
        mock_job_storage,
    ):
        device = NetworkLocation.objects.create(
            device_name="test device", base_url="https://some.server.test/extra/stuff"
        )
        extra_metadata = dict(
            facility=self.facility.id,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            facility_name="",
            device_name="",
            device_id="",
            baseurl="https://some.server.test/extra/stuff",
        )

        mock_job_storage.enqueue_job.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        mock_job_storage.get_job.return_value = fake_job(**fake_job_data)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        req_data = dict(
            facility=self.facility.id,
            type="kolibri.core.auth.tasks.peerfacilitysync",
            username="testuser",
            password="testpass",
            device_id=device.id,
        )

        network_client = NetworkClient.build_for_address.return_value
        network_client.base_url = "https://some.server.test/"

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertJobResponse(fake_job_data, response)

        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[0][0][0].kwargs,
            {
                "baseurl": "https://some.server.test/",
                "facility": self.facility.id,
                "chunk_size": 200,
                "noninteractive": True,
                "sync_session_id": None,
            },
        )

    def test_startdeletefacility(self, mock_job_storage):
        facility2 = Facility.objects.create(name="facility2")

        extra_metadata = dict(
            facility=facility2.id,
            facility_name=facility2.name,
        )

        mock_job_storage.enqueue_job.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        mock_job_storage.get_job.return_value = fake_job(**fake_job_data)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            dict(facility=facility2.id, type="kolibri.core.auth.tasks.deletefacility"),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[0][0][0].args,
            (facility2.id,),
        )

    def test_startdeletefacility__not_superuser(self, mock_job_storage):
        facility1 = Facility.objects.create(name="facility1")
        Facility.objects.create(name="facility2")

        user = FacilityUser.objects.create(
            username="notasuperuser", facility=self.facility
        )
        user.set_password(DUMMY_PASSWORD)
        user.save()

        DevicePermissions.objects.create(
            user=user, is_superuser=False, can_manage_content=True
        )
        self.client.logout()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            dict(facility=facility1.id, type="kolibri.core.auth.tasks.deletefacility"),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_startdeletefacility__facility_member(self, mock_job_storage):
        Facility.objects.create(name="facility2")

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            dict(
                facility=self.facility.id, type="kolibri.core.auth.tasks.deletefacility"
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data[0]["metadata"]["message"], "User is member of facility"
        )


class FacilityTaskHelperTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.device = NetworkLocation.objects.create(
            device_name="test_device", base_url="https://some.server.test/"
        )
        cls.facility = Facility.objects.create(name="test_facility")

    def test_validate_no_facility__validation_error(self):
        with self.assertRaises(serializers.ValidationError):
            SyncJobValidator(
                data={"type": "kolibri.core.auth.tasks.peerfacilitysync"}
            ).is_valid(raise_exception=True)

    def test_validate_empty_facility_id__validation_error__empty(self):
        with self.assertRaises(serializers.ValidationError):
            SyncJobValidator(
                data=dict(type="kolibri.core.auth.tasks.peerfacilitysync", facility="")
            ).is_valid(raise_exception=True)

    def test_validate_non_uuid_facility__validation_error__empty(self):
        with self.assertRaises(serializers.ValidationError):
            SyncJobValidator(
                data=dict(
                    type="kolibri.core.auth.tasks.peerfacilitysync",
                    facility="not a uuid",
                )
            ).is_valid(raise_exception=True)

    def test_validate_require_sync_session_id_for_resume(self):
        with self.assertRaises(serializers.ValidationError):
            SyncJobValidator(
                data=dict(
                    type="kolibri.core.auth.tasks.peerfacilitysync",
                    facility=self.facility.id,
                    command="resumesync",
                )
            ).is_valid(raise_exception=True)

    def test_validated_data(self):
        facility_id = self.facility.id
        validator = SyncJobValidator(
            data=dict(
                type="kolibri.core.auth.tasks.peerfacilitysync", facility=facility_id
            )
        )
        validator.is_valid(raise_exception=True)
        self.assertEqual(
            validator.validated_data["extra_metadata"],
            dict(
                facility_id=facility_id,
                facility_name=self.facility.name,
                sync_state=FacilitySyncState.PENDING,
                bytes_sent=0,
                bytes_received=0,
            ),
        )

    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_validate_peer_sync_job(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        dataset_id = 456
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://some.server.test/extra/stuff",
            username="tester",
            password="mypassword",
        )

        network_client = NetworkClient.build_for_address.return_value
        network_client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_facility_dataset_id.return_value = (facility_id, dataset_id)
        get_client_and_server_certs.return_value = None

        expected = dict(
            facility_id=facility_id,
            args=["sync"],
            enqueue_args={},
            kwargs=dict(
                baseurl="https://some.server.test/",
                facility=facility_id,
                sync_session_id=None,
                chunk_size=200,
                noninteractive=True,
            ),
            extra_metadata=dict(
                baseurl="https://some.server.test/",
                facility_id=facility_id,
                facility_name=self.facility.name,
                sync_state="PENDING",
                bytes_sent=0,
                bytes_received=0,
                device_name=self.device.device_name,
                device_id=self.device.id,
            ),
        )

        validator = PeerFacilitySyncJobValidator(data=data)
        validator.is_valid(raise_exception=True)
        self.maxDiff = None
        self.assertEqual(expected, validator.validated_data)

        MorangoProfileController.assert_called_with(PROFILE_FACILITY_DATA)
        controller.create_network_connection.assert_called_with(
            "https://some.server.test/"
        )

        get_facility_dataset_id.assert_called_with(
            "https://some.server.test/", identifier=facility_id, noninteractive=True
        )

        get_client_and_server_certs.assert_called_with(
            None,
            None,
            dataset_id,
            network_connection,
            user_id=None,
            facility_id=facility_id,
            noninteractive=True,
        )

    def test_validate_peer_sync_job__device_no_baseurl(self):
        facility_id = self.facility.id
        self.device.base_url = ""
        self.device.save()
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            username="tester",
            password="mypassword",
        )
        with self.assertRaises(serializers.ValidationError):
            PeerFacilitySyncJobValidator(data=data).is_valid(raise_exception=True)

    def test_validate_peer_sync_job__bad_url(self):
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="/com.bad.url.www//:sptth",
            username="tester",
            password="mypassword",
        )
        with self.assertRaises(serializers.ValidationError):
            PeerFacilitySyncJobValidator(data=data).is_valid(raise_exception=True)

    @patch("kolibri.core.auth.tasks.NetworkClient")
    def test_validate_peer_sync_job__cannot_connect(self, NetworkClient):
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://www.notfound.never",
            username="tester",
            password="mypassword",
        )
        NetworkClient.build_for_address.side_effect = NetworkLocationNotFound()
        with self.assertRaises(ResourceGoneError):
            PeerFacilitySyncJobValidator(data=data).is_valid(raise_exception=True)

    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials__unknown_facility(
        self, get_facility_dataset_id, NetworkClient, MorangoProfileController
    ):

        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://some.server.test/extra/stuff",
            username="tester",
            password="mypassword",
        )
        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_facility_dataset_id.side_effect = CommandError()
        with self.assertRaises(AuthenticationFailed):
            PeerFacilityImportJobValidator(data=data).is_valid(raise_exception=True)

    def test_validate_and_create_sync_credentials__not_authenticated(
        self,
    ):
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://some.server.test/extra/stuff",
        )

        with self.assertRaises(serializers.ValidationError):
            PeerFacilityImportJobValidator(data=data).is_valid(raise_exception=True)

    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials__authentication_failed(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://some.server.test/extra/stuff",
            username="tester",
            password="mypassword",
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_facility_dataset_id.return_value = (facility_id, 456)
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(AuthenticationFailed):
            PeerFacilityImportJobValidator(data=data).is_valid(raise_exception=True)

    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials_no_credentials(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        facility_id = self.facility.id
        data = dict(
            type="kolibri.core.auth.tasks.peerfacilitysync",
            facility=facility_id,
            device_id=self.device.id,
            baseurl="https://some.server.test/extra/stuff",
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_facility_dataset_id.return_value = (facility_id, 456)
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(PermissionDenied):
            PeerFacilitySyncJobValidator(data=data).is_valid(raise_exception=True)


class TestRequestSoUDSync(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name="Test")
        self.test_user = FacilityUser.objects.create(
            username="test", facility=self.facility
        )

    @patch("kolibri.core.auth.tasks.request_soud_sync")
    @patch(
        "kolibri.core.device.utils.get_device_setting",
        return_value=True,
    )
    def test_begin_request_soud_sync(self, mock_device_info, request_soud_sync):
        begin_request_soud_sync("whatever_server", self.test_user.id)
        request_soud_sync.enqueue.assert_called_with(
            args=("whatever_server", self.test_user.id)
        )

    @patch("kolibri.core.tasks.registry.job_storage")
    @patch("kolibri.core.auth.tasks.get_current_job")
    @patch("kolibri.core.auth.tasks.NetworkClient")
    @patch("kolibri.core.auth.tasks.requests")
    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_request_soud_sync(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        NetworkClient,
        get_current_job,
        job_storage,
    ):
        baseurl = "http://whatever.com:8000"
        self.device = NetworkLocation.objects.create(base_url=baseurl)
        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.json.return_value = {"action": SYNC}

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        network_client = NetworkClient.return_value
        network_client.base_url = baseurl

        current_job_mock = MagicMock()

        get_current_job.return_value = current_job_mock

        request_soud_sync(baseurl, self.test_user.id)
        self.assertEqual(current_job_mock.retry_in.call_count, 0)

        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.json.return_value = {
            "action": QUEUED,
            "keep_alive": "5",
            "id": str(uuid4()),
        }
        request_soud_sync("whatever_server", self.test_user.id)
        self.assertEqual(current_job_mock.retry_in.call_count, 1)

    @patch("kolibri.core.tasks.registry.job_storage")
    @patch("kolibri.core.auth.tasks.requests")
    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_request_soud_sync_server_error(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        job_storage,
    ):

        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.return_value.status_code = 500

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)

        self.assertEqual(job_storage.enqueue_in.call_count, 1)

    @patch("kolibri.core.tasks.registry.job_storage")
    @patch("kolibri.core.auth.tasks.requests")
    @patch("kolibri.core.auth.utils.sync.MorangoProfileController")
    @patch("kolibri.core.auth.utils.sync.get_client_and_server_certs")
    @patch("kolibri.core.auth.utils.sync.get_facility_dataset_id")
    def test_request_soud_sync_connection_error(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        MorangoProfileController,
        requests_mock,
        job_storage,
    ):

        get_client_and_server_certs.return_value = None
        get_facility_dataset_id.return_value = (
            self.facility.id,
            self.facility.dataset_id,
        )

        requests_mock.post.side_effect = ConnectionError

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        request_soud_sync("http://whatever:8000", self.test_user.id)

        self.assertEqual(job_storage.enqueue_in.call_count, 1)
