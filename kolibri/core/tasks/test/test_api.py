from django.urls import reverse
from mock import call
from mock import Mock
from mock import patch
from rest_framework import serializers
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobNotFound
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
            "extra_metadata": {},
            "facility_id": None,
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
                "extra_metadata": {},
                "facility_id": None,
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
                "extra_metadata": {},
                "facility_id": None,
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
            state=State.QUEUED, job_id="test", extra_metadata={"facility": "kolibri HQ"}
        )

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
            "extra_metadata": {
                "facility": "kolibri HQ",
            },
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
            state=State.QUEUED, job_id="test", extra_metadata={"facility": "kolibri HQ"}
        )

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
                "extra_metadata": {
                    "facility": "kolibri HQ",
                },
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
                "extra_metadata": {
                    "facility": "kolibri HQ",
                },
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
                "extra_metadata": {},
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
                "extra_metadata": {},
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
                "extra_metadata": {},
            },
        ]

    def tearDown(self):
        TaskRegistry.clear()

    def test_superuser_can_list_all_facility_jobs(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = self.jobs

        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:task-list"))

        self.assertEqual(response.data, self.jobs_response)
        mock_job_storage.get_all_jobs.assert_called_once_with(queue=None)

    def test_can_manage_content_can_only_view_can_manage_content_jobs(
        self, mock_job_storage
    ):
        mock_job_storage.get_all_jobs.return_value = self.jobs

        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:task-list"))

        self.assertEqual(response.data, [self.jobs_response[1], self.jobs_response[2]])
        mock_job_storage.get_all_jobs.assert_called_once_with(queue=None)

    def test_can_list_queue_specific_jobs(self, mock_job_storage):
        mock_job_storage.get_all_jobs.return_value = self.jobs[:2]
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

        response = self.client.get(
            reverse("kolibri:core:task-list"), {"queue": "kolibri"}
        )

        self.assertEqual(response.data, self.jobs_response[:2])
        mock_job_storage.get_all_jobs.assert_called_once_with(queue="kolibri")

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

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.data, self.jobs_response[0])
        mock_job_storage.get_job.assert_called_once_with(job_id="0")
        mock_job_storage.reset_mock()

        mock_job_storage.get_job.return_value = self.jobs[2]
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

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.status_code, 403)
        mock_job_storage.reset_mock()
        mock_job_storage.get_job.return_value = self.jobs[1]

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "1"})
        )
        self.assertEqual(response.data, self.jobs_response[1])
        mock_job_storage.get_job.assert_called_once_with(job_id="1")
        mock_job_storage.reset_mock()

        mock_job_storage.get_job.return_value = self.jobs[2]
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "2"})
        )
        self.assertEqual(response.data, self.jobs_response[2])
        mock_job_storage.get_job.assert_called_once_with(job_id="2")

    def test_retrieval_respects_registered_job_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.return_value = self.jobs[0]

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "0"})
        )
        self.assertEqual(response.status_code, 403)

    def test_retrieval_404(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)
        mock_job_storage.get_job.side_effect = JobNotFound

        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "3"})
        )
        self.assertEqual(response.status_code, 404)
        mock_job_storage.get_job.assert_called_once_with(job_id="3")

    def test_restart_task(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[2].job_id
        mock_job_storage.get_job.return_value = self.jobs[2]

        response = self.client.post(
            reverse("kolibri:core:task-restart", kwargs={"pk": "2"}), format="json"
        )

        self.assertEqual(response.data, self.jobs_response[2])
        mock_job_storage.restart_job.assert_called_once_with(job_id="2")

    def test_restart_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]

        response = self.client.post(
            reverse("kolibri:core:task-restart", kwargs={"pk": "0"}), format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_cancel_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]

        response = self.client.post(
            reverse("kolibri:core:task-cancel", kwargs={"pk": "0"}), format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_clear_task_respect_permissions(self, mock_job_storage):
        self.client.login(username=self.facility2user.username, password=DUMMY_PASSWORD)

        mock_job_storage.restart_job.return_value = self.jobs[0].job_id
        mock_job_storage.get_job.return_value = self.jobs[0]

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
