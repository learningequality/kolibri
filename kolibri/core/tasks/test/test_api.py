from django.core.urlresolvers import reverse
from iceqube.classes import Job
from iceqube.classes import State
from iceqube.exceptions import JobNotFound
from mock import MagicMock
from mock import patch
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings


@patch("kolibri.core.tasks.api.get_queue")
class TaskAPITestCase(APITestCase):
    def setUp(self):
        DUMMY_PASSWORD = "password"
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=self.facility
        )
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    def test_task_cancel(self, get_queue_mock):
        get_queue_mock.return_value.fetch_job.return_value = Job(
            state=State.CANCELED, func=lambda: None
        )
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.data, {})

    def test_task_cancel_no_task(self, get_queue_mock):
        get_queue_return_mock = MagicMock()
        get_queue_return_mock.cancel.side_effect = JobNotFound()
        get_queue_mock.return_value = get_queue_return_mock
        response = self.client.post(
            reverse("kolibri:core:task-canceltask"), {"task_id": "1"}, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_task_get_no_task(self, get_queue_mock):
        get_queue_return_mock = MagicMock()
        get_queue_return_mock.fetch_job.side_effect = JobNotFound()
        get_queue_mock.return_value = get_queue_return_mock
        response = self.client.get(
            reverse("kolibri:core:task-detail", kwargs={"pk": "1"}),
            {"task_id": "1"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
