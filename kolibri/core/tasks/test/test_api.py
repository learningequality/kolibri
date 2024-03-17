import datetime

import pytz
from django.urls import reverse
from django.utils.timezone import make_aware
from mock import call
from mock import Mock
from mock import patch
from pytz import utc
from rest_framework import serializers
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.permissions import CanManageContent
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.registry import RegisteredTask
from kolibri.core.tasks.registry import TaskRegistry
from kolibri.core.tasks.validation import JobValidator


DUMMY_PASSWORD = "password"

fake_job_defaults = dict(
    job_id=None,
    facility_id=None,
    state=None,
    exception="",
    traceback="",
    percentage_progress=0,
    cancellable=False,
    extra_metadata={},
    func="",
    args=(),
    kwargs={},
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


class BaseAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        DeviceSettings.objects.create(is_provisioned=True)

        cls.facility = Facility.objects.create(name="facility")
        cls.facility2 = Facility.objects.create(name="facility2")

        cls.superuser = FacilityUser.objects.create(
            username="superuser", facility=cls.facility
        )
        cls.superuser.set_password(DUMMY_PASSWORD)
        cls.superuser.save()

        cls.facility2user = FacilityUser.objects.create(
            username="facility2user", facility=cls.facility2
        )
        cls.facility2user.set_password(DUMMY_PASSWORD)
        cls.facility2user.save()

        DevicePermissions.objects.create(user=cls.superuser, is_superuser=True)
        DevicePermissions.objects.create(
            user=cls.facility2user, can_manage_content=True
        )


@patch("kolibri.core.tasks.api.job_storage")
class TaskAPITestCase(BaseAPITestCase):
    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def test_task_cancel(self, job_storage_mock):
        job_storage_mock.get_job.return_value = fake_job(
            state=State.QUEUED, cancellable=True
        )
        job_storage_mock.get_orm_job.return_value = dummy_orm_job_data
        TaskRegistry[""] = RegisteredTask(lambda x: None)
        response = self.client.post(
            reverse("kolibri:core:task-cancel", kwargs={"pk": "1"}), format="json"
        )
        self.assertEqual(response.data, {})
        TaskRegistry.clear()

    def test_task_cancel_no_task(self, job_storage_mock):
        job_storage_mock.cancel.side_effect = JobNotFound()
        response = self.client.post(
            reverse("kolibri:core:task-cancel", kwargs={"pk": "1"}), format="json"
        )
        self.assertEqual(response.status_code, 404)


@patch("kolibri.core.tasks.api.job_storage")
class CreateTaskAPITestCase(BaseAPITestCase):
    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def tearDown(self):
        TaskRegistry.clear()

    def test_api_validator_task_field_check(self, mock_job_storage):
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
            {"type": 100, "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            [{"type": 100, "x": 0, "y": 42}, {"type": True, "x": 0, "y": 42}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_validator_unregistered_task(self, mock_job_storage):
        # When "task" is not registered via the decorator.
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.add",
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
                    "type": "kolibri.core.tasks.test.test_api.add",
                    "x": 0,
                    "y": 42,
                }
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_validator_handles_task_permissions(self, mock_job_storage):
        @register_task(permission_classes=[IsSuperAdmin])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        # Let us logout the superuser to send request anonymously.
        self.client.logout()

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"type": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_api_errors_on_task_validator_wrong_return_type(self, mock_job_storage):
        class add_validator(JobValidator):
            def validate(self, data):
                return "kolibri"

        @register_task(validator=add_validator)
        def add(x, y):
            return x + y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        with self.assertRaises(TypeError):
            self.client.post(
                reverse("kolibri:core:task-list"),
                {"type": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
                format="json",
            )

    def test_api_reraises_task_validator_exception(self, mock_job_storage):
        class add_validator(JobValidator):
            def validate(self, data):
                raise TypeError

        @register_task(validator=add_validator)
        def add(x, y):
            return x + y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        with self.assertRaises(TypeError):
            self.client.post(
                reverse("kolibri:core:task-list"),
                {"type": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
                format="json",
            )

    def test_api_checks_extra_metadata_type(self, mock_job_storage):
        class add_validator(JobValidator):
            def validate(self, data):
                data["extra_metadata"] = "string"
                return data

        @register_task(validator=add_validator)
        def add(x, y):
            return x + y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add
        with self.assertRaises(TypeError):
            self.client.post(
                reverse("kolibri:core:task-list"),
                {"type": "kolibri.core.tasks.test.test_api.add", "x": 0, "y": 42},
                format="json",
            )

    def test_api_handles_single_task_without_validator(self, mock_job_storage):
        @register_task(permission_classes=[IsSuperAdmin])
        def add(x, y):
            return x + y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        mock_job_storage.enqueue_job.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            format="json",
        )

        expected_response = {
            "id": "test",
            "status": "QUEUED",
            "exception": "",
            "traceback": "",
            "percentage": 0,
            "type": "",
            "cancellable": False,
            "clearable": False,
            "args": (),
            "kwargs": {},
            "extra_metadata": {},
            "facility_id": None,
            "scheduled_datetime": make_aware(
                dummy_orm_job_data.scheduled_time, utc
            ).isoformat(),
            "repeat": dummy_orm_job_data.repeat,
            "repeat_interval": dummy_orm_job_data.interval,
            "retry_interval": dummy_orm_job_data.retry_interval,
        }

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the user's facility_id and the request's data as keyword args
        # to enqueue method?
        mock_job_storage.enqueue_job.assert_called_once()

        # Do we strip out any unexpected keys from the request data?
        self.assertEqual(mock_job_storage.enqueue_job.call_args[0][0].kwargs, {})

        # Do we retrieve the task from db to ready the response?
        mock_job_storage.get_job.assert_called_once_with("test")

    def test_api_handles_bulk_task_without_validator(self, mock_job_storage):
        @register_task(permission_classes=[IsSuperAdmin])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        mock_job_storage.enqueue_job.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        request_payload = [
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
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
                "type": "",
                "cancellable": False,
                "clearable": False,
                "args": (),
                "kwargs": {},
                "extra_metadata": {},
                "facility_id": None,
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "type": "",
                "cancellable": False,
                "clearable": False,
                "args": (),
                "kwargs": {},
                "extra_metadata": {},
                "facility_id": None,
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
        ]

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the user's facility_id and the request's data as keyword args
        # to enqueue method?
        self.assertEqual(mock_job_storage.enqueue_job.call_count, 2)

        for call_args in mock_job_storage.call_args_list:
            self.assertEqual(call_args[0][0].kwargs, {"kolibri": "fly"})
            self.assertEqual(
                call_args[0][0].extra_metadata,
                {
                    "started_by": self.superuser.id,
                    "started_by_username": self.superuser.username,
                },
            )

        # Do we retrieve the task from db to ready the response?
        self.assertEqual(mock_job_storage.get_job.call_count, 2)
        mock_job_storage.get_job.assert_has_calls([call("test"), call("test")])

    def test_api_handles_single_task_with_validator(self, mock_job_storage):
        test = self

        class add_validator(JobValidator):
            kolibri = serializers.CharField()

            def validate(self, data):
                # Does validator receives the right arguments?
                test.assertEqual(self.context["user"], test.superuser)
                test.assertEqual(
                    data["kolibri"],
                    "fly",
                )
                return {
                    "kwargs": {"x": 0, "y": 42},
                    "extra_metadata": {"facility": "kolibri HQ"},
                }

        @register_task(validator=add_validator, permission_classes=[IsSuperAdmin])
        def add(**kwargs):
            return kwargs["x"] + kwargs["y"]

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        mock_job_storage.enqueue_job.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED,
            job_id="test",
            kwargs={"x": 0, "y": 42},
            extra_metadata={"facility": "kolibri HQ"},
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            format="json",
        )

        expected_response = {
            "id": "test",
            "status": "QUEUED",
            "exception": "",
            "traceback": "",
            "percentage": 0,
            "type": "",
            "cancellable": False,
            "clearable": False,
            "facility_id": None,
            "args": (),
            "kwargs": {"x": 0, "y": 42},
            "extra_metadata": {
                "facility": "kolibri HQ",
            },
            "scheduled_datetime": make_aware(
                dummy_orm_job_data.scheduled_time, utc
            ).isoformat(),
            "repeat": dummy_orm_job_data.repeat,
            "repeat_interval": dummy_orm_job_data.interval,
            "retry_interval": dummy_orm_job_data.retry_interval,
        }

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the user's facility_id and the request's data as keyword args
        # to enqueue method?
        mock_job_storage.enqueue_job.assert_called_once()

        self.assertEqual(
            mock_job_storage.enqueue_job.call_args[0][0].kwargs, {"x": 0, "y": 42}
        )
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args[0][0].extra_metadata,
            {
                "facility": "kolibri HQ",
                "started_by": self.superuser.id,
                "started_by_username": self.superuser.username,
            },
        )

        # Do we retrieve the task from db to ready the response?
        mock_job_storage.get_job.assert_called_once_with("test")

    def test_api_handles_bulk_task_with_validator(self, mock_job_storage):
        test = self

        class add_validator(JobValidator):
            kolibri = serializers.CharField()

            def validate(self, data):
                # Does validator receives the right arguments?
                test.assertEqual(self.context["user"], test.superuser)
                test.assertEqual(
                    data["kolibri"],
                    "fly",
                )
                return {
                    "kwargs": {"x": 0, "y": 42},
                    "extra_metadata": {"facility": "kolibri HQ"},
                }

        @register_task(validator=add_validator, permission_classes=[IsSuperAdmin])
        def add(x, y):
            return x + y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

        mock_job_storage.enqueue_job.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED,
            job_id="test",
            kwargs={"x": 0, "y": 42},
            extra_metadata={"facility": "kolibri HQ"},
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        request_payload = [
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
            {"type": "kolibri.core.tasks.test.test_api.add", "kolibri": "fly"},
        ]

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add

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
                "type": "",
                "cancellable": False,
                "clearable": False,
                "facility_id": None,
                "args": (),
                "kwargs": {"x": 0, "y": 42},
                "extra_metadata": {
                    "facility": "kolibri HQ",
                },
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
            {
                "id": "test",
                "status": "QUEUED",
                "exception": "",
                "traceback": "",
                "percentage": 0,
                "type": "",
                "cancellable": False,
                "clearable": False,
                "facility_id": None,
                "args": (),
                "kwargs": {"x": 0, "y": 42},
                "extra_metadata": {
                    "facility": "kolibri HQ",
                },
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
        ]

        # Did API return the right stuff?
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, expected_response)

        # Do we call enqueue the right way i.e. are we passing
        # the user's facility_id and the request's data as keyword args
        # to enqueue method?
        self.assertEqual(mock_job_storage.enqueue_job.call_count, 2)

        for call_args in mock_job_storage.call_args_list:
            self.assertEqual(call_args[0][0].kwargs, {"x": 0, "y": 42})
            self.assertEqual(
                call_args[0][0].extra_metadata,
                {
                    "facility": "kolibri HQ",
                    "started_by": self.superuser.id,
                    "started_by_username": self.superuser.username,
                },
            )

        # Do we retrieve the task from db to ready the response?
        self.assertEqual(mock_job_storage.get_job.call_count, 2)
        mock_job_storage.get_job.assert_has_calls([call("test"), call("test")])


@patch("kolibri.core.tasks.api.job_storage")
class EnqueueArgsCreateAPITestCase(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super(EnqueueArgsCreateAPITestCase, cls).setUpTestData()

        cls.datetime_obj = datetime.datetime(year=2023, month=1, day=1, tzinfo=pytz.utc)
        cls.timedelta_obj = datetime.timedelta(days=1, hours=1)

        cls.enqueue_at_datetime = cls.datetime_obj.isoformat()
        cls.enqueue_in_timedelta = str(cls.timedelta_obj)

    def setUp(self):
        @register_task(job_id="test-id")
        def life():
            return 42

        TaskRegistry["kolibri.core.tasks.test.test_api.life"] = life
        self.registered_task = TaskRegistry["kolibri.core.tasks.test.test_api.life"]
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def tearDown(self):
        TaskRegistry.clear()

    def test_erroneous_request(self, mock_job_storage):
        erroneous_enqueue_args = [
            {"enqueue_at": self.enqueue_in_timedelta},  # Wrong format.
            {  # Both `enqueue_at` and `enqueue_in` specified.
                "enqueue_at": self.enqueue_at_datetime,
                "enqueue_in": self.enqueue_in_timedelta,
            },
            {"repeat": 1},  # `repeat` without enqueue_in, enqueue_at.
            {"repeat_interval": 1},  # `repeat_interval` without enqueue_in, enqueue_at.
            {  # `repeat` and `repeat_interval` 0 not allowed.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 0,
                "repeat_interval": 0,
            },
            {  # `repeat` not specified.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat_interval": 1,
            },
            {  # `repeat_interval` not specified.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 1,
            },
            {  # Task infinite repeat but no `repeat_interval`.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
            },
            {  # Invalid priority specified.
                "enqueue_at": self.enqueue_at_datetime,
                "priority": 1,
            },
            {  # Priority set to None
                "enqueue_at": self.enqueue_at_datetime,
                "priority": None,
            },
        ]

        for err_enq_arg in erroneous_enqueue_args:
            response = self.client.post(
                reverse("kolibri:core:task-list"),
                {
                    "type": "kolibri.core.tasks.test.test_api.life",
                    "enqueue_args": err_enq_arg,
                },
                format="json",
            )
            # Did API raise `ValidationError`` on erroneous input?
            self.assertEqual(response.status_code, 400)

    def test_acceptable_request(self, mock_job_storage):
        acceptable_enqueue_args = [
            {},
            {
                "enqueue_at": self.enqueue_at_datetime,
            },
            {
                "enqueue_in": self.enqueue_in_timedelta,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 1,
                "repeat_interval": 1,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
                "repeat_interval": 86400,
            },
            {
                "enqueue_in": self.enqueue_in_timedelta,
                "repeat": None,
                "repeat_interval": 360,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
                "repeat_interval": 7200,
                "retry_interval": 60,
            },
            {
                "retry_interval": 0,
            },
            {
                "retry_interval": 900,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "priority": 10,
            },
        ]

        mock_job_storage.get_job.return_value = fake_job(state=State.QUEUED)
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        for enq_arg in acceptable_enqueue_args:

            response = self.client.post(
                reverse("kolibri:core:task-list"),
                {
                    "type": "kolibri.core.tasks.test.test_api.life",
                    "enqueue_args": enq_arg,
                },
                format="json",
            )

            # Did API call go through successfully?
            self.assertEqual(response.status_code, 200)

    def test_enqueue_at(self, mock_job_storage):
        enqueue_args = {
            "enqueue_at": self.enqueue_at_datetime,
            "repeat": None,
            "repeat_interval": 60,
        }

        job, validated_enq_args = self.registered_task.validate_job_data(
            user=self.superuser, data={"enqueue_args": enqueue_args}
        )

        mock_job_storage.enqueue_at.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.life",
                "enqueue_args": enqueue_args,
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we schedule the job at specified enqueue_at?
        self.assertEqual(mock_job_storage.enqueue_at.call_args[0][0], self.datetime_obj)

    def test_enqueue_in(self, mock_job_storage):
        enqueue_args = {
            "enqueue_in": self.enqueue_in_timedelta,
            "repeat": None,
            "repeat_interval": 60,
        }

        mock_job_storage.enqueue_in.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.life",
                "enqueue_args": enqueue_args,
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Make sure the task is scheduled after one day and one hour
        self.assertEqual(
            mock_job_storage.enqueue_in.call_args[0][0], self.timedelta_obj
        )

    def test_enqueue_job_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_job.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.life",
                "enqueue_args": {"retry_interval": 60},
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args[1]["retry_interval"], 60
        )

    def test_enqueue_at_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_at.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.life",
                "enqueue_args": {
                    "enqueue_at": self.enqueue_at_datetime,
                    "repeat": 10,
                    "repeat_interval": 86400,
                    "retry_interval": 60,
                },
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(mock_job_storage.enqueue_at.call_args[1]["retry_interval"], 60)

    def test_enqueue_in_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_in.return_value = "test"
        mock_job_storage.get_job.return_value = fake_job(
            state=State.QUEUED, job_id="test"
        )
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-list"),
            {
                "type": "kolibri.core.tasks.test.test_api.life",
                "enqueue_args": {
                    "enqueue_in": self.enqueue_in_timedelta,
                    "retry_interval": 60,
                },
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(mock_job_storage.enqueue_in.call_args[1]["retry_interval"], 60)


@patch("kolibri.core.tasks.api.job_storage")
class EnqueueArgsUpdateAPITestCase(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super(EnqueueArgsUpdateAPITestCase, cls).setUpTestData()

        cls.datetime_obj = datetime.datetime(year=2023, month=1, day=1, tzinfo=pytz.utc)
        cls.timedelta_obj = datetime.timedelta(days=1, hours=1)

        cls.enqueue_at_datetime = cls.datetime_obj.isoformat()
        cls.enqueue_in_timedelta = str(cls.timedelta_obj)

    def setUp(self):
        @register_task(job_id="test-id")
        def life():
            return 42

        TaskRegistry["kolibri.core.tasks.test.test_api.life"] = life
        self.registered_task = TaskRegistry["kolibri.core.tasks.test.test_api.life"]
        self.fake_job = fake_job(
            state=State.QUEUED,
            job_id="test-id",
            func="kolibri.core.tasks.test.test_api.life",
        )
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def tearDown(self):
        TaskRegistry.clear()

    def test_erroneous_request(self, mock_job_storage):
        mock_job_storage.get_job.return_value = self.fake_job
        erroneous_enqueue_args = [
            {"enqueue_at": self.enqueue_in_timedelta},  # Wrong format.
            {  # Both `enqueue_at` and `enqueue_in` specified.
                "enqueue_at": self.enqueue_at_datetime,
                "enqueue_in": self.enqueue_in_timedelta,
            },
            {"repeat": 1},  # `repeat` without enqueue_in, enqueue_at.
            {"repeat_interval": 1},  # `repeat_interval` without enqueue_in, enqueue_at.
            {  # `repeat` and `repeat_interval` 0 not allowed.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 0,
                "repeat_interval": 0,
            },
            {  # `repeat` not specified.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat_interval": 1,
            },
            {  # `repeat_interval` not specified.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 1,
            },
            {  # Task infinite repeat but no `repeat_interval`.
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
            },
        ]

        for err_enq_arg in erroneous_enqueue_args:
            response = self.client.patch(
                reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
                {
                    "enqueue_args": err_enq_arg,
                },
                format="json",
            )
            # Did API raise `ValidationError`` on erroneous input?
            self.assertEqual(response.status_code, 400)

    def test_acceptable_request(self, mock_job_storage):
        acceptable_enqueue_args = [
            {},
            {
                "enqueue_at": self.enqueue_at_datetime,
            },
            {
                "enqueue_in": self.enqueue_in_timedelta,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": 1,
                "repeat_interval": 1,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
                "repeat_interval": 86400,
            },
            {
                "enqueue_in": self.enqueue_in_timedelta,
                "repeat": None,
                "repeat_interval": 360,
            },
            {
                "enqueue_at": self.enqueue_at_datetime,
                "repeat": None,
                "repeat_interval": 7200,
                "retry_interval": 60,
            },
            {
                "retry_interval": 0,
            },
            {
                "retry_interval": 900,
            },
        ]

        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        for enq_arg in acceptable_enqueue_args:

            response = self.client.patch(
                reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
                {
                    "enqueue_args": enq_arg,
                },
                format="json",
            )

            # Did API call go through successfully?
            self.assertEqual(response.status_code, 200)

    def test_enqueue_at(self, mock_job_storage):
        enqueue_args = {
            "enqueue_at": self.enqueue_at_datetime,
            "repeat": None,
            "repeat_interval": 60,
        }

        job, validated_enq_args = self.registered_task.validate_job_data(
            user=self.superuser, data={"enqueue_args": enqueue_args}
        )

        mock_job_storage.enqueue_at.return_value = "test-id"
        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": enqueue_args,
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we schedule the job at specified enqueue_at?
        self.assertEqual(mock_job_storage.enqueue_at.call_args[0][0], self.datetime_obj)

    def test_enqueue_in(self, mock_job_storage):
        enqueue_args = {
            "enqueue_in": self.enqueue_in_timedelta,
            "repeat": None,
            "repeat_interval": 60,
        }

        mock_job_storage.enqueue_in.return_value = "test-id"
        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": enqueue_args,
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Make sure the task is scheduled after one day and one hour
        self.assertEqual(
            mock_job_storage.enqueue_in.call_args[0][0], self.timedelta_obj
        )

    def test_enqueue_job_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_job.return_value = "test-id"
        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": {"retry_interval": 60},
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(
            mock_job_storage.enqueue_job.call_args[1]["retry_interval"], 60
        )

    def test_enqueue_at_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_at.return_value = "test-id"
        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": {
                    "enqueue_at": self.enqueue_at_datetime,
                    "repeat": 10,
                    "repeat_interval": 86400,
                    "retry_interval": 60,
                },
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(mock_job_storage.enqueue_at.call_args[1]["retry_interval"], 60)

    def test_enqueue_in_with_retry_interval(self, mock_job_storage):
        mock_job_storage.enqueue_in.return_value = "test-id"
        mock_job_storage.get_job.return_value = self.fake_job
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": {
                    "enqueue_in": self.enqueue_in_timedelta,
                    "retry_interval": 60,
                },
            },
            format="json",
        )

        # Did API call go through successfully?
        self.assertEqual(response.status_code, 200)
        # Did we set `retry_interval` correctly?
        self.assertEqual(mock_job_storage.enqueue_in.call_args[1]["retry_interval"], 60)

    def test_update_while_running(self, mock_job_storage):
        mock_job_storage.enqueue_in.side_effect = JobRunning
        mock_job_storage.get_job.return_value = self.fake_job
        self.fake_job.state = State.RUNNING
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.patch(
            reverse("kolibri:core:task-detail", kwargs={"pk": "test-id"}),
            {
                "enqueue_args": {
                    "enqueue_in": self.enqueue_in_timedelta,
                    "retry_interval": 60,
                },
            },
            format="json",
        )

        # Did API call return correct error code?
        self.assertEqual(response.status_code, 409)


@patch("kolibri.core.tasks.api.job_storage")
class ListAPIRepeat(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super(ListAPIRepeat, cls).setUpTestData()

        @register_task
        def life():
            return 42

        TaskRegistry["kolibri.core.tasks.test.test_api.life"] = life

    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def test_list_api_repeating_true(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = []
        response = self.client.get(
            reverse("kolibri:core:task-list"), {"repeating": "true"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_job_storage.get_all_jobs.call_args[1]["repeating"], True)

    def test_list_api_repeating_false(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = []
        response = self.client.get(
            reverse("kolibri:core:task-list"), {"repeating": "false"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_job_storage.get_all_jobs.call_args[1]["repeating"], False)

    def test_list_api_repeating_invalid_value(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = []
        response = self.client.get(
            reverse("kolibri:core:task-list"), {"repeating": "typo"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            mock_job_storage.get_all_jobs.call_args[1],
            {"queue": None, "repeating": None},
        )

    def test_list_api_repeating_not_present(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = []
        response = self.client.get(reverse("kolibri:core:task-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            mock_job_storage.get_all_jobs.call_args[1],
            {"queue": None, "repeating": None},
        )


@patch("kolibri.core.tasks.api.job_storage")
class TaskManagementAPITestCase(BaseAPITestCase):
    def setUp(self):
        @register_task(permission_classes=[IsSuperAdmin], queue="kolibri")
        def add(x, y):
            return x + y

        @register_task(permission_classes=[CanManageContent], queue="kolibri")
        def multiply(x, y):
            return x * y

        @register_task(permission_classes=[CanManageContent], queue="le")
        def subtract(x, y):
            return x - y

        TaskRegistry["kolibri.core.tasks.test.test_api.add"] = add
        TaskRegistry["kolibri.core.tasks.test.test_api.multiply"] = multiply
        TaskRegistry["kolibri.core.tasks.test.test_api.subtract"] = subtract

        self.jobs = [
            Job(
                func=add,
                job_id="0",
                facility_id=self.superuser.facility_id,
                state=State.QUEUED,
            ),
            Job(
                func=multiply,
                job_id="1",
                facility_id=self.superuser.facility_id,
                state=State.QUEUED,
            ),
            Job(
                func=subtract,
                job_id="2",
                facility_id=self.facility2user.facility_id,
                state=State.QUEUED,
            ),
        ]
        self.jobs_response = [
            {
                "status": State.QUEUED,
                "exception": None,
                "traceback": "",
                "percentage": 0,
                "type": "kolibri.core.tasks.test.test_api.add",
                "id": "0",
                "cancellable": False,
                "clearable": False,
                "facility_id": self.superuser.facility_id,
                "args": (),
                "kwargs": {},
                "extra_metadata": {},
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
            {
                "status": State.QUEUED,
                "exception": None,
                "traceback": "",
                "percentage": 0,
                "type": "kolibri.core.tasks.test.test_api.multiply",
                "id": "1",
                "cancellable": False,
                "clearable": False,
                "facility_id": self.superuser.facility_id,
                "args": (),
                "kwargs": {},
                "extra_metadata": {},
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
            {
                "status": State.QUEUED,
                "exception": None,
                "traceback": "",
                "percentage": 0,
                "type": "kolibri.core.tasks.test.test_api.subtract",
                "id": "2",
                "cancellable": False,
                "clearable": False,
                "facility_id": self.facility2user.facility_id,
                "args": (),
                "kwargs": {},
                "extra_metadata": {},
                "scheduled_datetime": make_aware(
                    dummy_orm_job_data.scheduled_time, utc
                ).isoformat(),
                "repeat": dummy_orm_job_data.repeat,
                "repeat_interval": dummy_orm_job_data.interval,
                "retry_interval": dummy_orm_job_data.retry_interval,
            },
        ]

    def tearDown(self):
        TaskRegistry.clear()

    def test_superuser_can_list_all_facility_jobs(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = self.jobs
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:task-list"))

        self.assertEqual(response.data, self.jobs_response)
        mock_job_storage.get_all_jobs.assert_called_once_with(
            queue=None, repeating=None
        )

    def test_can_manage_content_can_only_view_can_manage_content_jobs(
        self, mock_job_storage
    ):
        mock_job_storage.get_all_jobs.return_value = self.jobs
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:task-list"))

        self.assertEqual(response.data, [self.jobs_response[1], self.jobs_response[2]])
        mock_job_storage.get_all_jobs.assert_called_once_with(
            queue=None, repeating=None
        )

    def test_can_list_queue_specific_jobs(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = self.jobs[:2]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

        response = self.client.get(
            reverse("kolibri:core:task-list"), {"queue": "kolibri"}
        )

        self.assertEqual(response.data, self.jobs_response[:2])
        mock_job_storage.get_all_jobs.assert_called_once_with(
            queue="kolibri", repeating=None
        )

    def test_task_clearable_flag(self, mock_job_storage):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_all_jobs.return_value = [
            fake_job(state=state)
            for state in [
                # Not clearable.
                State.SCHEDULED,
                State.QUEUED,
                State.RUNNING,
                State.CANCELING,
                # Clearable.
                State.FAILED,
                State.CANCELED,
                State.COMPLETED,
            ]
        ]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.get(reverse("kolibri:core:task-list"))

        def assert_clearable(index, expected):
            self.assertEqual(response.data[index]["clearable"], expected)

        for i in [0, 1, 2, 3]:
            assert_clearable(i, False)
        for i in [4, 5, 6]:
            assert_clearable(i, True)

    def test_can_superuser_retrieve_any_job(self, mock_job_storage):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.data, self.jobs_response[0])
        mock_job_storage.get_job.assert_called_once_with(job_id="0")
        mock_job_storage.reset_mock()

        mock_job_storage.get_job.return_value = self.jobs[2]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "2"})
        )
        self.assertEqual(response.data, self.jobs_response[2])
        mock_job_storage.get_job.assert_called_once_with(job_id="2")

    def test_can_manage_content_can_retrieve_can_manage_content_jobs(
        self, mock_job_storage
    ):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.status_code, 403)
        mock_job_storage.reset_mock()
        mock_job_storage.get_job.return_value = self.jobs[1]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "1"})
        )
        self.assertEqual(response.data, self.jobs_response[1])
        mock_job_storage.get_job.assert_called_once_with(job_id="1")
        mock_job_storage.reset_mock()

        mock_job_storage.get_job.return_value = self.jobs[2]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "2"})
        )
        self.assertEqual(response.data, self.jobs_response[2])
        mock_job_storage.get_job.assert_called_once_with(job_id="2")

    def test_retrieval_respects_registered_job_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.status_code, 403)

    def test_retrieval_404(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.side_effect = JobNotFound()

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "3"})
        )
        self.assertEqual(response.status_code, 404)
        mock_job_storage.get_job.assert_called_once_with(job_id="3")

    def test_restart_task(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[2].job_id
        mock_job_storage.get_job.return_value = self.jobs[2]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-restart", kwargs={"pk": "2"}), format="json"
        )

        self.assertEqual(response.data, self.jobs_response[2])
        mock_job_storage.restart_job.assert_called_once_with(job_id="2")

    def test_restart_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-restart", kwargs={"pk": "0"}), format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_cancel_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-cancel", kwargs={"pk": "0"}), format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_clear_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]
        mock_job_storage.get_orm_job.return_value = dummy_orm_job_data

        response = self.client.post(
            reverse("kolibri:core:task-clear", kwargs={"pk": "0"}), format="json"
        )

        self.assertEqual(response.status_code, 403)


@patch("kolibri.core.tasks.api.job_storage")
class TaskAPIPermissionsTestCase(APITestCase):
    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        admin = FacilityUserFactory(facility=self.facility)
        self.facility.add_admin(admin)
        self.client.login(username=admin.username, password=DUMMY_PASSWORD)

    def test_list_permissions(self, job_storage_mock):
        response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)


class CSRFProtectedTaskTestCase(APITestCase):
    def setUp(self):
        self.client_csrf = APIClient(enforce_csrf_checks=True)

    def test_csrf_protected_task(self):
        response = self.client_csrf.post(
            reverse("kolibri:core:task-list"), {}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
