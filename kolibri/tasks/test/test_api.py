from django.core.urlresolvers import reverse
from mock import patch
from rest_framework.test import APITestCase

from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings


@patch('kolibri.tasks.api.get_client')
class TaskAPITestCase(APITestCase):

    def setUp(self):
        DUMMY_PASSWORD = 'password'
        DeviceSettings.objects.create(is_provisioned=True)
        self.facility = Facility.objects.create(name='facility')
        superuser = FacilityUser.objects.create(username='superuser', facility=self.facility)
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    def test_task_cancel(self, get_client_mock):
        response = self.client.post(reverse('task-canceltask'), {'task_id': '1'}, format='json')
        self.assertEqual(response.data, {})
