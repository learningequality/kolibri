import datetime
from uuid import uuid4

from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from mock import Mock
from mock import patch
from morango.models import SyncSession
from morango.models import TransferSession
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APITestCase

from .helpers import clear_process_cache
from .helpers import provision_device
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import cleanupsync
from kolibri.core.auth.tasks import CleanUpSyncsValidator
from kolibri.core.auth.tasks import enqueue_soud_sync_processing
from kolibri.core.auth.tasks import PeerFacilityImportJobValidator
from kolibri.core.auth.tasks import PeerFacilitySyncJobValidator
from kolibri.core.auth.tasks import soud_sync_processing
from kolibri.core.auth.tasks import SyncJobValidator
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.utils.time_utils import naive_utc_datetime


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
    databases = "__all__"

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
            ),
        )
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args_list[1][0][0].kwargs,
            dict(
                facility=facility3.id,
                chunk_size=200,
                noninteractive=True,
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
    databases = "__all__"

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


class SoudTasksTestCase(TestCase):
    @patch("kolibri.core.auth.tasks.job_storage")
    @patch("kolibri.core.auth.tasks.soud_sync_processing")
    @patch("kolibri.core.auth.tasks.soud")
    def test_enqueue_soud_sync_processing__future__scheduled(
        self, mock_soud, mock_task, mock_job_storage
    ):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=30)
        mock_job = mock_job_storage.get_orm_job.return_value
        mock_job.state = State.QUEUED
        mock_job.scheduled_time = naive_utc_datetime(timezone.now())
        enqueue_soud_sync_processing()
        mock_task.enqueue_in.assert_not_called()

    @patch("kolibri.core.auth.tasks.job_storage")
    @patch("kolibri.core.auth.tasks.soud_sync_processing")
    @patch("kolibri.core.auth.tasks.soud")
    def test_enqueue_soud_sync_processing__future__running(
        self, mock_soud, mock_task, mock_job_storage
    ):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=1)
        mock_job = mock_job_storage.get_orm_job.return_value
        mock_job.state = State.RUNNING
        mock_job.scheduled_time = naive_utc_datetime(timezone.now())
        enqueue_soud_sync_processing()
        mock_task.enqueue_in.assert_not_called()

    @patch("kolibri.core.auth.tasks.job_storage")
    @patch("kolibri.core.auth.tasks.soud_sync_processing")
    @patch("kolibri.core.auth.tasks.soud")
    def test_enqueue_soud_sync_processing__future__reschedule(
        self, mock_soud, mock_task, mock_job_storage
    ):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=10)
        mock_job = mock_job_storage.get_orm_job.return_value
        mock_job.state = State.QUEUED
        mock_job.scheduled_time = naive_utc_datetime(
            timezone.now() + datetime.timedelta(seconds=15)
        )
        enqueue_soud_sync_processing()
        mock_task.enqueue_in.assert_called_once_with(datetime.timedelta(seconds=10))

    @patch("kolibri.core.auth.tasks.job_storage")
    @patch("kolibri.core.auth.tasks.soud_sync_processing")
    @patch("kolibri.core.auth.tasks.soud")
    def test_enqueue_soud_sync_processing__completed__enqueue(
        self, mock_soud, mock_task, mock_job_storage
    ):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=10)
        mock_job = mock_job_storage.get_orm_job.return_value
        mock_job.state = State.COMPLETED
        # far in the past
        mock_job.scheduled_time = naive_utc_datetime(
            timezone.now() - datetime.timedelta(seconds=100)
        )
        enqueue_soud_sync_processing()
        mock_task.enqueue_in.assert_called_once_with(datetime.timedelta(seconds=10))

    @patch("kolibri.core.auth.tasks.job_storage")
    @patch("kolibri.core.auth.tasks.soud_sync_processing")
    @patch("kolibri.core.auth.tasks.soud")
    def test_enqueue_soud_sync_processing__race__already_running(
        self, mock_soud, mock_task, mock_job_storage
    ):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=10)
        mock_job = mock_job_storage.get_orm_job.return_value
        mock_job.state = State.COMPLETED
        # far in the past
        mock_job.scheduled_time = naive_utc_datetime(
            timezone.now() - datetime.timedelta(seconds=100)
        )
        mock_task.enqueue_in.side_effect = JobRunning()
        enqueue_soud_sync_processing()
        mock_task.enqueue_in.assert_called_once_with(datetime.timedelta(seconds=10))

    @patch("kolibri.core.auth.tasks.get_current_job")
    @patch("kolibri.core.auth.tasks.soud")
    def test_soud_sync_processing__requeue__now(self, mock_soud, mock_get_job):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(seconds=0)
        soud_sync_processing()
        mock_soud.execute_syncs.assert_called_once()
        mock_job = mock_get_job.return_value
        mock_job.retry_in.assert_called_once_with(datetime.timedelta(seconds=0))

    @patch("kolibri.core.auth.tasks.get_current_job")
    @patch("kolibri.core.auth.tasks.soud")
    def test_soud_sync_processing__requeue__future(self, mock_soud, mock_get_job):
        mock_soud.get_time_to_next_attempt.return_value = datetime.timedelta(
            seconds=100
        )
        soud_sync_processing()
        mock_soud.execute_syncs.assert_called_once()
        mock_job = mock_get_job.return_value
        mock_job.retry_in.assert_called_once_with(datetime.timedelta(seconds=100))

    @patch("kolibri.core.auth.tasks.get_current_job")
    @patch("kolibri.core.auth.tasks.soud")
    def test_soud_sync_processing__no_requeue(self, mock_soud, mock_get_job):
        mock_soud.get_time_to_next_attempt.return_value = None
        soud_sync_processing()
        mock_soud.execute_syncs.assert_called_once()
        mock_get_job.assert_not_called()
        mock_job = mock_get_job.return_value
        mock_job.retry_in.assert_not_called()


class CleanUpSyncsTaskValidatorTestCase(TestCase):
    def setUp(self):
        self.kwargs = dict(
            type=cleanupsync.__name__,
            push=True,
            pull=False,
            sync_filter=uuid4().hex,
            client_instance_id=uuid4().hex,
        )

    def test_validator__no_push_no_pull(self):
        self.kwargs.pop("push")
        self.kwargs.pop("pull")
        validator = CleanUpSyncsValidator(data=self.kwargs)
        with self.assertRaisesRegex(serializers.ValidationError, "Either pull or push"):
            validator.is_valid(raise_exception=True)

    def test_validator__both_push_and_pull(self):
        self.kwargs.update(pull=True)
        validator = CleanUpSyncsValidator(data=self.kwargs)
        with self.assertRaisesRegex(
            serializers.ValidationError, "Only one of pull or push"
        ):
            validator.is_valid(raise_exception=True)

    def test_validator__no_client_instance_id_no_server_instance_id(self):
        self.kwargs.pop("client_instance_id")
        validator = CleanUpSyncsValidator(data=self.kwargs)
        with self.assertRaisesRegex(
            serializers.ValidationError,
            "Either client_instance_id or server_instance_id",
        ):
            validator.is_valid(raise_exception=True)

    def test_validator__both_client_instance_id_and_server_instance_id(self):
        self.kwargs.update(server_instance_id=uuid4().hex)
        validator = CleanUpSyncsValidator(data=self.kwargs)
        with self.assertRaisesRegex(
            serializers.ValidationError,
            "Only one of client_instance_id or server_instance_id",
        ):
            validator.is_valid(raise_exception=True)

    def test_validator__no_sync_filter(self):
        self.kwargs.pop("sync_filter")
        validator = CleanUpSyncsValidator(data=self.kwargs)
        with self.assertRaises(serializers.ValidationError):
            validator.is_valid(raise_exception=True)


class CleanUpSyncsTaskTestCase(TestCase):
    def setUp(self):
        self.kwargs = dict(
            push=True,
            pull=False,
            sync_filter=uuid4().hex,
            client_instance_id=uuid4().hex,
        )

    @patch("kolibri.core.auth.tasks.CleanUpSyncsValidator")
    def test_runs_validator(self, mock_validator):
        mock_validator.return_value = mock_validator
        mock_validator.is_valid.side_effect = serializers.ValidationError
        with self.assertRaises(serializers.ValidationError):
            cleanupsync(**self.kwargs)
        mock_validator.assert_called_with(
            data=dict(type=cleanupsync.__name__, **self.kwargs)
        )
        mock_validator.is_valid.assert_called_with(raise_exception=True)

    @patch("kolibri.core.auth.tasks.call_command")
    def test_calls_command(self, mock_call_command):
        cleanupsync(**self.kwargs)
        mock_call_command.assert_called_with(
            "cleanupsyncs",
            expiration=1,
            push=self.kwargs["push"],
            pull=self.kwargs["pull"],
            sync_filter=self.kwargs["sync_filter"],
            client_instance_id=self.kwargs["client_instance_id"],
        )

    def test_actual_run__not_provisioned(self):
        clear_process_cache()
        with self.assertRaisesRegex(CommandError, "Kolibri is unprovisioned"):
            cleanupsync(**self.kwargs)

    def _create_sync(self, last_activity_timestamp=None, client_instance_id=None):
        if last_activity_timestamp is None:
            last_activity_timestamp = timezone.now() - datetime.timedelta(hours=2)

        sync_session = SyncSession.objects.create(
            id=uuid4().hex,
            active=True,
            client_instance_id=client_instance_id or self.kwargs["client_instance_id"],
            server_instance_id=uuid4().hex,
            last_activity_timestamp=last_activity_timestamp,
            profile=PROFILE_FACILITY_DATA,
        )
        transfer_session = TransferSession.objects.create(
            id=uuid4().hex,
            active=True,
            sync_session=sync_session,
            push=self.kwargs["push"],
            filter=self.kwargs["sync_filter"],
            last_activity_timestamp=last_activity_timestamp,
        )
        return (sync_session, transfer_session)

    def test_actual_run__cleanup(self):
        provision_device()

        sync_session, transfer_session = self._create_sync()
        (
            alt_instance_id_sync_session,
            alt_instance_id_transfer_session,
        ) = self._create_sync(client_instance_id=uuid4().hex)
        recent_sync_session, recent_transfer_session = self._create_sync(
            last_activity_timestamp=timezone.now() - datetime.timedelta(minutes=1)
        )

        cleanupsync(**self.kwargs)

        sync_session.refresh_from_db()
        transfer_session.refresh_from_db()
        alt_instance_id_sync_session.refresh_from_db()
        alt_instance_id_transfer_session.refresh_from_db()

        self.assertFalse(sync_session.active)
        self.assertFalse(transfer_session.active)
        self.assertTrue(alt_instance_id_sync_session.active)
        self.assertTrue(alt_instance_id_transfer_session.active)
        self.assertTrue(recent_sync_session.active)
        self.assertTrue(recent_transfer_session.active)
