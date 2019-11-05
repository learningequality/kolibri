from django.core.urlresolvers import reverse
from mock import patch
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State

DUMMY_PASSWORD = "password"


@patch("kolibri.core.tasks.api.queue")
class TaskAPITestCase(APITestCase):
    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name="facility")
        superuser = FacilityUser.objects.create(
            username="superuser", facility=self.facility
        )
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    def test_task_cancel(self, queue_mock):
        queue_mock.fetch_job.return_value = Job(state=State.CANCELED, func=lambda: None)
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
                reverse("kolibri:core:task-startexportlogcsv"), format="json"
            )
        self.assertEqual(response.status_code, 200)

    def test_list_permissions(self):
        with patch("kolibri.core.tasks.api._job_to_response", return_value={}):
            response = self.client.get(reverse("kolibri:core:task-list"), format="json")
        self.assertEqual(response.status_code, 200)
