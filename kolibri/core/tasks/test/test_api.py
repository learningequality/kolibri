from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.urlresolvers import reverse
from django.test import TestCase
from mock import ANY
from mock import call
from mock import Mock
from mock import patch
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import NotAuthenticated
from rest_framework.exceptions import ParseError
from rest_framework.request import Request
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.tasks.api import prepare_sync_task
from kolibri.core.tasks.api import ResourceGoneError
from kolibri.core.tasks.api import validate_and_prepare_peer_sync_job
from kolibri.core.tasks.api import validate_prepare_sync_job
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State

DUMMY_PASSWORD = "password"

fake_job_defaults = dict(
    job_id=None,
    state=None,
    exception="",
    traceback="",
    percentage_progress=0,
    cancellable=False,
    extra_metadata=dict(),
    func=lambda: None,
)


def fake_job(**kwargs):
    fake_data = fake_job_defaults.copy()
    fake_data.update(kwargs)
    return Mock(spec=Job, **fake_data)


class BaseAPITestCase(APITestCase):
    def _setup_device(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=self.facility
        )
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)
        return superuser


@patch("kolibri.core.tasks.api.queue")
class TaskAPITestCase(BaseAPITestCase):
    def setUp(self):
        self._setup_device()

    def test_task_cancel(self, queue_mock):
        queue_mock.fetch_job.return_value = fake_job(state=State.CANCELED)
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.data, {})

    def test_task_cancel_no_task(self, queue_mock):
        queue_mock.cancel.side_effect = JobNotFound()
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_task_get_no_task(self, queue_mock):
        queue_mock.fetch_job.side_effect = JobNotFound()
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "1"}),
            {"task_id": "1"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)


class TaskAPIPermissionsTestCase(APITestCase):
    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        admin = FacilityUserFactory(facility=self.facility)
        self.facility.add_admin(admin)
        self.client.login(username=admin.username, password=DUMMY_PASSWORD)

    def test_exportlogs_permissions(self):
        with patch("kolibri.core.tasks.api._job_to_response", return_value={}):
            response = self.client.post(
                reverse("kolibri:core:task-startexportlogcsv"),
                {"facility": self.facility.pk},
                format="json",
            )
        self.assertEqual(response.status_code, 200)

    def test_list_permissions(self):
        with patch("kolibri.core.tasks.api._job_to_response", return_value={}):
            response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)


@patch("kolibri.core.tasks.api.facility_queue", spec=True)
class FacilityTaskAPITestCase(BaseAPITestCase):
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

        for key, value in extra.items():
            self.assertEqual(
                value,
                response.data.get(key),
                "Extra metadata key `{}` doesn't match".format(key),
            )

    def test_list_unprovisioned(self, facility_queue):
        facility_queue.jobs.return_value = []
        response = self.client.get(
            reverse("kolibri:core:facilitytask-list"), format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_provisioned(self, facility_queue):
        DeviceSettings.objects.create(is_provisioned=True)

        response = self.client.get(
            reverse("kolibri:core:facilitytask-list"), format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_startdataportalsync(self, facility_queue):
        user = self._setup_device()

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=True,
            extra_metadata=dict(this_is_extra=True,),
        )
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdataportalsync"),
            {"facility": self.facility.dataset_id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)

        facility_queue.enqueue.assert_called_with(
            call_command,
            "sync",
            facility=self.facility.dataset_id,
            chunk_size=50,
            noninteractive=True,
            extra_metadata=dict(
                facility=self.facility.dataset_id,
                started_by=user.pk,
                sync_state="PENDING",
                bytes_sent=0,
                bytes_received=0,
                type="SYNCDATAPORTAL",
            ),
            track_progress=True,
            cancellable=True,
        )

    def test_startdataportalbulksync(self, facility_queue):
        user = self._setup_device()

        facility2 = Facility.objects.create(name="facility 2")
        facility3 = Facility.objects.create(name="facility 3")
        dataset_ids = [facility2.dataset_id, facility3.dataset_id]
        FacilityDataset.objects.filter(pk__in=dataset_ids).update(registered=True)

        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=True,
            extra_metadata=dict(this_is_extra=True,),
        )
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdataportalbulksync"), format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(2, facility_queue.enqueue.call_count)

        facility_queue.enqueue.assert_has_calls(
            [
                call(
                    call_command,
                    "sync",
                    facility=facility2.dataset_id,
                    chunk_size=50,
                    noninteractive=True,
                    extra_metadata=dict(
                        facility=facility2.dataset_id,
                        started_by=user.pk,
                        sync_state="PENDING",
                        bytes_sent=0,
                        bytes_received=0,
                        type="SYNCDATAPORTAL",
                    ),
                    track_progress=True,
                    cancellable=True,
                ),
                call(
                    call_command,
                    "sync",
                    facility=facility3.dataset_id,
                    chunk_size=50,
                    noninteractive=True,
                    extra_metadata=dict(
                        facility=facility3.dataset_id,
                        started_by=user.pk,
                        sync_state="PENDING",
                        bytes_sent=0,
                        bytes_received=0,
                        type="SYNCDATAPORTAL",
                    ),
                    track_progress=True,
                    cancellable=True,
                ),
            ]
        )

    @patch("kolibri.core.tasks.api.validate_and_prepare_peer_sync_job")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    def test_startpeerfacilityimport(
        self,
        get_client_and_server_certs,
        validate_and_prepare_peer_sync_job,
        facility_queue,
    ):
        user = self._setup_device()

        extra_metadata = dict(
            facility=self.facility.dataset_id,
            started_by=user.pk,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            type="SYNCPEER/PULL",
        )
        prepared_data = dict(
            baseurl="https://some.server.test/",
            facility=self.facility.dataset_id,
            no_push=True,
            chunk_size=50,
            noninteractive=True,
            extra_metadata=extra_metadata,
            track_progress=True,
            cancellable=True,
        )
        validate_and_prepare_peer_sync_job.return_value = prepared_data.copy()

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=True,
            extra_metadata=dict(this_is_extra=True,),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        req_data = dict(
            facility=self.facility.dataset_id,
            baseurl="https://some.server.test/extra/stuff",
        )

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startpeerfacilityimport"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)

        validate_and_prepare_peer_sync_job.assert_has_calls(
            [call(ANY, no_push=True, extra_metadata=extra_metadata,)]
        )
        facility_queue.enqueue.assert_called_with(call_command, "sync", **prepared_data)

    @patch("kolibri.core.tasks.api.validate_and_prepare_peer_sync_job")
    def test_startpeerfacilitysync(
        self, validate_and_prepare_peer_sync_job, facility_queue,
    ):
        user = self._setup_device()

        extra_metadata = dict(
            facility=self.facility.dataset_id,
            started_by=user.pk,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            type="SYNCPEER/FULL",
        )
        prepared_data = dict(
            baseurl="https://some.server.test/",
            facility=self.facility.dataset_id,
            chunk_size=50,
            noninteractive=True,
            extra_metadata=extra_metadata,
            track_progress=True,
            cancellable=True,
        )
        validate_and_prepare_peer_sync_job.return_value = prepared_data.copy()

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=True,
            extra_metadata=dict(this_is_extra=True,),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        req_data = dict(
            facility=self.facility.dataset_id,
            baseurl="https://some.server.test/extra/stuff",
        )

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startpeerfacilitysync"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)

        validate_and_prepare_peer_sync_job.assert_has_calls(
            [call(ANY, extra_metadata=extra_metadata,)]
        )
        facility_queue.enqueue.assert_called_with(call_command, "sync", **prepared_data)


class FacilityTaskHelperTestCase(TestCase):
    def test_prepare_sync_task(self):
        user = Mock(spec=FacilityUser, pk=456)
        req = Mock(spec=Request, data=dict(facility=123), user=user)

        expected = dict(
            facility=123,
            started_by=456,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            other_kwarg="is test",
        )
        actual = prepare_sync_task(req, other_kwarg="is test")
        self.assertEqual(expected, actual)

    def test_validate_prepare_sync_job(self):
        req = Mock(spec=Request, data=dict(facility=123))

        expected = dict(
            facility=123,
            chunk_size=50,
            noninteractive=True,
            track_progress=True,
            cancellable=True,
            extra_metadata=dict(type="test"),
        )
        actual = validate_prepare_sync_job(req, extra_metadata=dict(type="test"))
        self.assertEqual(expected, actual)

    def test_validate_prepare_sync_job__parse_error(self):
        req = Mock(spec="rest_framework.requests.Request", data=dict())

        with self.assertRaises(ParseError):
            validate_prepare_sync_job(req, extra_metadata=dict(type="test"))

    def test_validate_prepare_sync_job__parse_error__empty(self):
        req = Mock(spec="rest_framework.requests.Request", data=dict(facility=""))

        with self.assertRaises(ParseError):
            validate_prepare_sync_job(req, extra_metadata=dict(type="test"))

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_dataset_id")
    def test_validate_and_prepare_peer_sync_job(
        self,
        get_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        dataset_id = 456
        req = Mock(
            spec=Request,
            data=dict(
                facility=123,
                baseurl="https://some.server.test/extra/stuff",
                username="tester",
                password="mypassword",
            ),
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_dataset_id.return_value = dataset_id
        get_client_and_server_certs.return_value = None

        expected = dict(
            baseurl="https://some.server.test/",
            facility=123,
            chunk_size=50,
            noninteractive=True,
            track_progress=True,
            cancellable=True,
            extra_metadata=dict(type="test"),
        )
        actual = validate_and_prepare_peer_sync_job(
            req, extra_metadata=dict(type="test")
        )
        self.assertEqual(expected, actual)

        MorangoProfileController.assert_called_with("facilitydata")
        controller.create_network_connection.assert_called_with(
            "https://some.server.test/"
        )

        get_dataset_id.assert_called_with(
            "https://some.server.test/", identifier=123, noninteractive=True
        )

        get_client_and_server_certs.assert_called_with(
            "tester", "mypassword", dataset_id, network_connection, noninteractive=True
        )

    def test_validate_and_prepare_peer_sync_job__no_baseurl(self):
        req = Mock(spec=Request, data=dict(facility=123,),)

        with self.assertRaises(ParseError, msg="Missing `baseurl` parameter"):
            validate_and_prepare_peer_sync_job(req)

    def test_validate_and_prepare_peer_sync_job__bad_url(self):
        req = Mock(
            spec=Request, data=dict(facility=123, baseurl="/com.bad.url.www//:sptth",),
        )

        with self.assertRaises(ParseError, msg="Invalid URL"):
            validate_and_prepare_peer_sync_job(req)

    @patch("kolibri.core.tasks.api.NetworkClient")
    def test_validate_and_prepare_peer_sync_job__cannot_connect(self, NetworkClient):
        req = Mock(
            spec=Request,
            data=dict(facility=123, baseurl="https://www.notfound.never",),
        )

        NetworkClient.side_effect = NetworkLocationNotFound()

        with self.assertRaises(ResourceGoneError):
            validate_and_prepare_peer_sync_job(req)

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_dataset_id")
    def test_validate_and_prepare_peer_sync_job__unknown_facility(
        self, get_dataset_id, NetworkClient, MorangoProfileController
    ):
        req = Mock(
            spec=Request,
            data=dict(
                facility=123,
                baseurl="https://some.server.test/extra/stuff",
                username="tester",
                password="mypassword",
            ),
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_dataset_id.side_effect = CommandError()

        with self.assertRaises(AuthenticationFailed):
            validate_and_prepare_peer_sync_job(req, extra_metadata=dict(type="test"))

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_dataset_id")
    def test_validate_and_prepare_peer_sync_job__not_authenticated(
        self,
        get_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        req = Mock(
            spec=Request,
            data=dict(facility=123, baseurl="https://some.server.test/extra/stuff",),
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_dataset_id.return_value = 456
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(NotAuthenticated):
            validate_and_prepare_peer_sync_job(req, extra_metadata=dict(type="test"))

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_dataset_id")
    def test_validate_and_prepare_peer_sync_job__authentication_failed(
        self,
        get_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        req = Mock(
            spec=Request,
            data=dict(
                facility=123,
                baseurl="https://some.server.test/extra/stuff",
                username="tester",
                password="mypassword",
            ),
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_dataset_id.return_value = 456
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(AuthenticationFailed):
            validate_and_prepare_peer_sync_job(req, extra_metadata=dict(type="test"))
