from collections import OrderedDict

from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.urlresolvers import reverse
from django.test import TestCase
from mock import call
from mock import Mock
from mock import patch
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.test import APITestCase

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.tasks.api import prepare_peer_sync_job
from kolibri.core.tasks.api import prepare_sync_job
from kolibri.core.tasks.api import prepare_sync_task
from kolibri.core.tasks.api import ResourceGoneError
from kolibri.core.tasks.api import validate_and_create_sync_credentials
from kolibri.core.tasks.api import validate_facility
from kolibri.core.tasks.api import validate_peer_sync_job
from kolibri.core.tasks.api import validate_sync_task
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import State


DUMMY_PASSWORD = "password"

fake_job_defaults = dict(
    job_id=None,
    state=None,
    exception="",
    traceback="",
    percentage_progress=0,
    cancellable=False,
    extra_metadata={},
    func=lambda: None,
)


def fake_job(**kwargs):
    fake_data = fake_job_defaults.copy()
    fake_data.update(kwargs)
    return Mock(spec=Job, **fake_data)


class BaseAPITestCase(APITestCase):
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


@patch("kolibri.core.tasks.api.priority_queue")
@patch("kolibri.core.tasks.api.queue")
class TaskAPITestCase(BaseAPITestCase):
    def test_task_cancel(self, queue_mock, priority_queue_mock):
        queue_mock.fetch_job.return_value = fake_job(state=State.CANCELED)
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.data, {})

    def test_task_cancel_no_task(self, queue_mock, priority_queue_mock):
        queue_mock.cancel.side_effect = JobNotFound()
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_task_get_no_task(self, queue_mock, priority_queue_mock):
        queue_mock.fetch_job.side_effect = JobNotFound()
        priority_queue_mock.fetch_job.side_effect = JobNotFound()
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "1"}),
            {"task_id": "1"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_tasks_clearable_flag(self, queue_mock, priority_queue_mock):
        queue_mock.jobs = [
            fake_job(state=state)
            for state in [
                # not clearable
                State.SCHEDULED,
                State.QUEUED,
                State.RUNNING,
                State.CANCELING,
                # clearable
                State.FAILED,
                State.CANCELED,
                State.COMPLETED,
            ]
        ]
        priority_queue_mock.jobs = []
        response = self.client.get(reverse("kolibri:core:task-list"))

        def assert_clearable(index, expected):
            self.assertEqual(response.data[index]["clearable"], expected)

        for i in [0, 1, 2, 3]:
            assert_clearable(i, False)
        for i in [4, 5, 6]:
            assert_clearable(i, True)

    def test_restart_task(self, queue_mock, priority_queue_mock):
        queue_mock.restart_job.return_value = 1
        queue_mock.fetch_job.return_value = fake_job(state=State.QUEUED, job_id=1)

        response = self.client.post(
            reverse("kolibri:core:task-restarttask"), {"task_id": "1"}, format="json"
        )

        expected_response = {
            "status": "QUEUED",
            "exception": "",
            "traceback": "",
            "percentage": 0,
            "id": 1,
            "cancellable": False,
            "clearable": False,
        }

        self.assertDictEqual(response.data, expected_response)


@patch("kolibri.core.tasks.api.job_storage")
@patch("kolibri.core.tasks.job.RegisteredJob.enqueue")
class CreateTaskAPITestCase(BaseAPITestCase):
    def tearDown(self):
        JobRegistry.REGISTERED_JOBS.clear()

    def test_api_validator_task_field_check(self, mock_enqueue, mock_job_storage):
        # When "task" is absent.
        response = self.client.post(
            reverse("kolibri:core:task-list"), {"x": 0, "y": 42}, format="json"
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            [{"x": 0, "y": 42}, {"x": 0, "y": 42}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        # When "task" has a value of incorrect type.
        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": 100, "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            [{"task": 100, "x": 0, "y": 42}, {"task": True, "x": 0, "y": 42}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_validator_unregistered_task(self, mock_enqueue, mock_job_storage):
        # When "task" is not registered via the decorator.
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "task": "kolibri.core.tasks.test.test_api.add",
                "x": 0,
                "y": 42,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            [
                {
                    "task": "kolibri.core.tasks.test.test_api.add",
                    "x": 0,
                    "y": 42,
                }
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_validator_handles_task_permissions(
        self, mock_enqueue, mock_job_storage
    ):
        @register_task(permission_classes=[IsSuperuser])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        # Let us logout the superuser to send request anonymously.
        self.client.logout()

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_api_errors_on_task_validator_wrong_return_type(
        self, mock_enqueue, mock_job_storage
    ):
        def add_validator(request, req_data):
            return "kolibri"

        @register_task(validator=add_validator)
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_reraises_task_validator_exception(
        self, mock_enqueue, mock_job_storage
    ):
        def add_validator(req, req_data):
            raise TypeError

        @register_task(validator=add_validator)
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        with self.assertRaises(TypeError):
            self.client.post(
                reverse("kolibri:core:task-list"),
                {"task": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
                format="json",
            )

    def test_api_checks_extra_metadata_type(self, mock_enqueue, mock_job_storage):
        def add_validator(req, req_data):
            req_data["extra_metadata"] = "string"
            return req_data

        @register_task(validator=add_validator)
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_handles_single_task_without_vaidator(
        self, mock_enqueue, mock_job_storage
    ):
        @register_task(permission_classes=[IsSuperuser])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        mock_enqueue.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            format="json",
        )

        expected_response = {
            "id": "test",
            "status": "QUEUED",
            "exception": "",
            "traceback": "",
            "percentage": 0,
            "cancellable": False,
            "clearable": False,
        }

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the request's data as keyword args to enqueue method?
        mock_enqueue.assert_called_once_with(**{"kolibri": "fly"})

        # Do we retrieve the task from db to ready the response?
        mock_job_storage.get_job.assert_called_once_with("test")

    def test_api_handles_bulk_task_without_vaidator(
        self, mock_enqueue, mock_job_storage
    ):
        @register_task(permission_classes=[IsSuperuser])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        mock_enqueue.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )

        request_payload = [
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
        ]

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            request_payload,
            format="json",
        )

        expected_response = [
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "cancellable": False,
                "clearable": False,
            },
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "cancellable": False,
                "clearable": False,
            },
        ]

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the request's data as keyword args to enqueue method?
        self.assertEqual(mock_enqueue.call_count, 2)
        mock_enqueue.assert_has_calls(
            [
                call(**{"kolibri": "fly"}),
                call(**{"kolibri": "fly"}),
            ]
        )

        # Do we retrieve the task from db to ready the response?
        self.assertEqual(mock_job_storage.get_job.call_count, 2)
        mock_job_storage.get_job.assert_has_calls([call("test"), call("test")])

    def test_api_handles_single_task_with_vaidator(
        self, mock_enqueue, mock_job_storage
    ):
        def add_validator(req, req_data):
            # Does validator receives the right arguments?
            self.assertIsInstance(req, Request)
            self.assertDictEqual(
                req_data,
                {"kolibri": "fly"},
            )
            return {"x": 0, "y": 42, "extra_metadata": {"facility": "kolibri HQ"}}

        @register_task(validator=add_validator, permission_classes=[IsSuperuser])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        mock_enqueue.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test", extra_metadata={"facility": "kolibri HQ"}
        )

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            format="json",
        )

        expected_response = {
            "id": "test",
            "status": "QUEUED",
            "exception": "",
            "traceback": "",
            "percentage": 0,
            "cancellable": False,
            "clearable": False,
            "facility": "kolibri HQ",
        }

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the return value of validator as keyword args to enqueue method?
        mock_enqueue.assert_called_once_with(
            **{"x": 0, "y": 42, "extra_metadata": {"facility": "kolibri HQ"}}
        )

        # Do we retrieve the task from db to ready the response?
        mock_job_storage.get_job.assert_called_once_with("test")

    def test_api_handles_bulk_task_with_validator(self, mock_enqueue, mock_job_storage):
        def add_validator(req, req_data):
            # Does validator receives the right arguments?
            self.assertIsInstance(req, Request)
            self.assertDictEqual(
                req_data,
                {"kolibri": "fly"},
            )
            return {"x": 0, "y": 42, "extra_metadata": {"facility": "kolibri HQ"}}

        @register_task(validator=add_validator, permission_classes=[IsSuperuser])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        mock_enqueue.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test", extra_metadata={"facility": "kolibri HQ"}
        )

        request_payload = [
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            {"task": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
        ]
        response = self.client.post(
            reverse("kolibri:core:task-list"),
            request_payload,
            format="json",
        )

        expected_response = [
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "cancellable": False,
                "clearable": False,
                "facility": "kolibri HQ",
            },
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "cancellable": False,
                "clearable": False,
                "facility": "kolibri HQ",
            },
        ]

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the return value of validator as keyword args to enqueue method?
        self.assertEqual(mock_enqueue.call_count, 2)
        mock_enqueue.assert_has_calls(
            [
                call(**{"x": 0, "y": 42, "extra_metadata": {"facility": "kolibri HQ"}}),
                call(**{"x": 0, "y": 42, "extra_metadata": {"facility": "kolibri HQ"}}),
            ]
        )

        # Do we retrieve the task from db to ready the response?
        self.assertEqual(mock_job_storage.get_job.call_count, 2)
        mock_job_storage.get_job.assert_has_calls([call("test"), call("test")])


@patch("kolibri.core.tasks.api.priority_queue")
@patch("kolibri.core.tasks.api.queue")
class TaskAPIPermissionsTestCase(APITestCase):
    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        admin = FacilityUserFactory(facility=self.facility)
        self.facility.add_admin(admin)
        self.client.login(username=admin.username, password=DUMMY_PASSWORD)

    def test_exportlogs_permissions(self, queue_mock, priority_queue_mock):
        with patch("kolibri.core.tasks.api._job_to_response", return_value={}):
            response = self.client.post(
                reverse("kolibri:core:task-startexportlogcsv"),
                {"facility": self.facility.pk},
                format="json",
            )
        self.assertEqual(response.status_code, 200)

    def test_list_permissions(self, queue_mock, priority_queue_mock):
        with patch("kolibri.core.tasks.api._job_to_response", return_value={}):
            response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)


@patch("kolibri.core.tasks.api.facility_queue")
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
        response = self.client.get(
            reverse("kolibri:core:facilitytask-list"), format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_startdataportalsync(self, facility_queue):
        user = self.superuser

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdataportalsync"),
            {"facility": self.facility.id, "facility_name": "my facility name"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)

        facility_queue.enqueue.assert_called_with(
            call_command,
            "sync",
            facility=self.facility.id,
            chunk_size=200,
            noninteractive=True,
            extra_metadata=dict(
                facility=self.facility.id,
                facility_name="my facility name",
                started_by=user.pk,
                started_by_username=user.username,
                sync_state="PENDING",
                bytes_sent=0,
                bytes_received=0,
                type="SYNCDATAPORTAL",
            ),
            track_progress=True,
            cancellable=False,
        )

    def test_startdataportalbulksync(self, facility_queue):
        user = self.superuser

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
                    facility=facility2.id,
                    chunk_size=200,
                    noninteractive=True,
                    extra_metadata=dict(
                        facility=facility2.id,
                        facility_name="facility 2",
                        started_by=user.pk,
                        started_by_username=user.username,
                        sync_state="PENDING",
                        bytes_sent=0,
                        bytes_received=0,
                        type="SYNCDATAPORTAL",
                    ),
                    track_progress=True,
                    cancellable=False,
                ),
                call(
                    call_command,
                    "sync",
                    facility=facility3.id,
                    chunk_size=200,
                    noninteractive=True,
                    extra_metadata=dict(
                        facility=facility3.id,
                        facility_name="facility 3",
                        started_by=user.pk,
                        started_by_username=user.username,
                        sync_state="PENDING",
                        bytes_sent=0,
                        bytes_received=0,
                        type="SYNCDATAPORTAL",
                    ),
                    track_progress=True,
                    cancellable=False,
                ),
            ],
            any_order=True,
        )

    @patch("kolibri.core.tasks.api.validate_peer_sync_job")
    @patch("kolibri.core.tasks.api.prepare_peer_sync_job")
    @patch("kolibri.core.tasks.api.validate_and_create_sync_credentials")
    def test_startpeerfacilityimport(
        self,
        validate_and_create_sync_credentials,
        prepare_peer_sync_job,
        validate_peer_sync_job,
        facility_queue,
    ):
        user = self.superuser

        extra_metadata = dict(
            facility=self.facility.id,
            started_by=user.pk,
            started_by_username=user.username,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            type="SYNCPEER/PULL",
            facility_name="",
            device_name="",
            device_id="",
            baseurl="https://some.server.test/extra/stuff",
        )
        request_data = OrderedDict(baseurl="https://some.server.test/")
        request_data["facility"] = self.facility.id
        request_data["username"] = ""
        request_data["password"] = ""
        prepared_data = dict(
            baseurl="https://some.server.test/",
            facility=self.facility.id,
            no_push=True,
            chunk_size=200,
            noninteractive=True,
            extra_metadata=extra_metadata,
            track_progress=True,
            cancellable=False,
        )
        validate_peer_sync_job.return_value = request_data.copy()
        prepare_peer_sync_job.return_value = prepared_data.copy()

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        req_data = dict(
            facility=self.facility.id, baseurl="https://some.server.test/extra/stuff"
        )

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startpeerfacilityimport"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)
        prepare_peer_sync_job.assert_has_calls(
            [
                call(
                    "baseurl",
                    "facility",
                    no_push=True,
                    no_provision=True,
                    extra_metadata=extra_metadata,
                )
            ]
        )
        facility_queue.enqueue.assert_called_with(call_command, "sync", **prepared_data)

    @patch("kolibri.core.tasks.api.prepare_peer_sync_job")
    @patch("kolibri.core.tasks.api.validate_peer_sync_job")
    @patch("kolibri.core.tasks.api.validate_and_create_sync_credentials")
    def test_startpeerfacilitysync(
        self,
        validate_and_create_sync_credentials,
        validate_peer_sync_job,
        prepare_peer_sync_job,
        facility_queue,
    ):
        user = self.superuser

        extra_metadata = dict(
            facility=self.facility.id,
            started_by=user.pk,
            started_by_username=user.username,
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            type="SYNCPEER/FULL",
            facility_name="",
            device_name="",
            device_id="",
            baseurl="https://some.server.test/extra/stuff",
        )
        request_data = OrderedDict(baseurl="https://some.server.test/")
        request_data["facility"] = self.facility.id
        request_data["username"] = ""
        request_data["password"] = ""
        prepared_data = OrderedDict(
            baseurl="https://some.server.test/",
            facility=self.facility.id,
            chunk_size=200,
            noninteractive=True,
            extra_metadata=extra_metadata,
            track_progress=True,
            cancellable=False,
        )
        validate_peer_sync_job.return_value = request_data.copy()
        prepare_peer_sync_job.return_value = prepared_data.copy()

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            percentage_progress=42,
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        req_data = dict(
            facility=self.facility.id, baseurl="https://some.server.test/extra/stuff"
        )

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startpeerfacilitysync"),
            req_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)
        prepare_peer_sync_job.assert_has_calls(
            [call("baseurl", "facility", extra_metadata=extra_metadata)]
        )
        facility_queue.enqueue.assert_called_with(call_command, "sync", **prepared_data)

    def test_startdeletefacility(self, facility_queue):
        user = self.superuser
        facility2 = Facility.objects.create(name="facility2")

        extra_metadata = dict(
            facility=facility2.id,
            facility_name=facility2.name,
            started_by=user.pk,
            started_by_username=user.username,
            type="DELETEFACILITY",
        )
        prepared_data = dict(
            facility=facility2.id,
            noninteractive=True,
            extra_metadata=extra_metadata,
            track_progress=True,
            cancellable=False,
        )

        facility_queue.enqueue.return_value = 123
        fake_job_data = dict(
            job_id=123,
            state="testing",
            cancellable=False,
            extra_metadata=dict(this_is_extra=True),
        )
        fake_job_data["extra_metadata"].update(extra_metadata)
        facility_queue.fetch_job.return_value = fake_job(**fake_job_data)

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdeletefacility"),
            dict(facility=facility2.id),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJobResponse(fake_job_data, response)

        facility_queue.enqueue.assert_called_with(
            call_command, "deletefacility", **prepared_data
        )

    def test_startdeletefacility__sole_facility(self, facility_queue):
        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdeletefacility"),
            dict(facility=self.facility.id),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual("SOLE_FACILITY", response.data.get("code"))

    def test_startdeletefacility__not_superuser(self, facility_queue):
        facility1 = Facility.objects.create(name="facility1")
        Facility.objects.create(name="facility2")

        user = FacilityUser.objects.create(username="notasuperuser", facility=facility1)
        user.set_password(DUMMY_PASSWORD)
        user.save()

        DevicePermissions.objects.create(
            user=user, is_superuser=False, can_manage_content=True
        )
        self.client.logout()
        self.client.login(username=user.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdeletefacility"),
            dict(facility=facility1.id),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_startdeletefacility__facility_member(self, facility_queue):
        Facility.objects.create(name="facility2")

        response = self.client.post(
            reverse("kolibri:core:facilitytask-startdeletefacility"),
            dict(facility=self.facility.id),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual("FACILITY_MEMBER", response.data.get("code"))


class FacilityTaskHelperTestCase(TestCase):
    def test_validate_sync_task(self):
        user = Mock(spec=FacilityUser, pk=456, username="abc")
        req = Mock(spec=Request, data=dict(facility=123), user=user)

        expected = dict(
            facility=123,
            started_by=456,
            started_by_username="abc",
            sync_state="PENDING",
            bytes_sent=0,
            bytes_received=0,
            other_kwarg="is test",
        )
        actual = prepare_sync_task(*validate_sync_task(req), other_kwarg="is test")
        self.assertEqual(expected, actual)

    def test__prepare_sync_job(self):
        expected = dict(
            facility=123,
            chunk_size=200,
            noninteractive=True,
            track_progress=True,
            cancellable=False,
            extra_metadata=dict(type="test"),
        )
        actual = prepare_sync_job(facility=123, extra_metadata=dict(type="test"))
        self.assertEqual(expected, actual)

    def test_validate_facility__parse_error(self):
        req = Mock(spec="rest_framework.requests.Request", data={})

        with self.assertRaises(ParseError):
            validate_facility(req)

    def test_validate_facility__parse_error__empty(self):
        req = Mock(spec="rest_framework.requests.Request", data=dict(facility=""))

        with self.assertRaises(ParseError):
            validate_facility(req)

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_validate_peer_sync_job(
        self,
        get_facility_dataset_id,
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

        get_facility_dataset_id.return_value = (123, dataset_id)
        get_client_and_server_certs.return_value = None

        expected = dict(
            baseurl="https://some.server.test/",
            facility=123,
            chunk_size=200,
            noninteractive=True,
            track_progress=True,
            cancellable=False,
            extra_metadata=dict(type="test"),
        )
        req_params = validate_peer_sync_job(req)
        validate_and_create_sync_credentials(*req_params)
        actual = prepare_peer_sync_job(
            *req_params[:2], extra_metadata=dict(type="test")
        )
        self.assertEqual(expected, actual)

        MorangoProfileController.assert_called_with(PROFILE_FACILITY_DATA)
        controller.create_network_connection.assert_called_with(
            "https://some.server.test/"
        )

        get_facility_dataset_id.assert_called_with(
            "https://some.server.test/", identifier=123, noninteractive=True
        )

        get_client_and_server_certs.assert_called_with(
            "tester",
            "mypassword",
            dataset_id,
            network_connection,
            user_id=None,
            facility_id=123,
            noninteractive=True,
        )

    def test_validate_peer_sync_job__no_baseurl(self):
        req = Mock(spec=Request, data=dict(facility=123))

        with self.assertRaises(ParseError, msg="Missing `baseurl` parameter"):
            validate_peer_sync_job(req)

    def test_validate_peer_sync_job__bad_url(self):
        req = Mock(
            spec=Request, data=dict(facility=123, baseurl="/com.bad.url.www//:sptth")
        )

        with self.assertRaises(ParseError, msg="Invalid URL"):
            validate_peer_sync_job(req)

    @patch("kolibri.core.tasks.api.NetworkClient")
    def test_validate_peer_sync_job__cannot_connect(self, NetworkClient):
        req = Mock(
            spec=Request, data=dict(facility=123, baseurl="https://www.notfound.never")
        )

        NetworkClient.side_effect = NetworkLocationNotFound()

        with self.assertRaises(ResourceGoneError):
            validate_peer_sync_job(req)

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials__unknown_facility(
        self, get_facility_dataset_id, NetworkClient, MorangoProfileController
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

        get_facility_dataset_id.side_effect = CommandError()

        with self.assertRaises(AuthenticationFailed):
            validate_and_create_sync_credentials(*validate_peer_sync_job(req))

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials__not_authenticated(
        self,
        get_facility_dataset_id,
        get_client_and_server_certs,
        NetworkClient,
        MorangoProfileController,
    ):
        req = Mock(
            spec=Request,
            data=dict(facility=123, baseurl="https://some.server.test/extra/stuff"),
        )

        client = NetworkClient.return_value
        client.base_url = "https://some.server.test/"

        network_connection = Mock()
        controller = MorangoProfileController.return_value
        controller.create_network_connection.return_value = network_connection

        get_facility_dataset_id.return_value = (123, 456)
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(PermissionDenied):
            validate_and_create_sync_credentials(*validate_peer_sync_job(req))

    @patch("kolibri.core.tasks.api.MorangoProfileController")
    @patch("kolibri.core.tasks.api.NetworkClient")
    @patch("kolibri.core.tasks.api.get_client_and_server_certs")
    @patch("kolibri.core.tasks.api.get_facility_dataset_id")
    def test_validate_and_create_sync_credentials__authentication_failed(
        self,
        get_facility_dataset_id,
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

        get_facility_dataset_id.return_value = (123, 456)
        get_client_and_server_certs.side_effect = CommandError()

        with self.assertRaises(AuthenticationFailed):
            validate_and_create_sync_credentials(*validate_peer_sync_job(req))
