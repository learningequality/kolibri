import mock
import requests

from django.core.cache import cache
from django.core.urlresolvers import reverse
from kolibri.auth.models import Facility, FacilityUser
from kolibri.core.device.models import DeviceSettings, DevicePermissions
from rest_framework import status
from rest_framework.test import APITestCase

DUMMY_PASSWORD = "password"


def mock_patch_decorator(func):

    def wrapper(*args, **kwargs):
        mock_object = mock.Mock()
        mock_object.json.return_value = {'good': 'response'}
        with mock.patch.object(requests, 'get', return_value=mock_object):
            return func(*args, **kwargs)

    return wrapper


class TasksAPITestCase(APITestCase):

    def setUp(self):
        DeviceSettings.objects.create(is_provisioned=True)
        facility = Facility.objects.create(name='facility')
        superuser = FacilityUser.objects.create(username='superuser', facility=facility)
        superuser.set_password(DUMMY_PASSWORD)
        superuser.save()
        DevicePermissions.objects.create(user=superuser, is_superuser=True)
        self.client.login(username=superuser.username, password=DUMMY_PASSWORD)

    @mock_patch_decorator
    def test_channel_info(self):
        response = self.client.post(reverse('task-channelinfo'), {'channel_id': 'abc'}, format='json')
        self.assertEqual(response.data['good'], 'response')

    @mock_patch_decorator
    def test_channel_info_cache(self):
        self.client.post(reverse('task-channelinfo'), {'channel_id': 'abc'}, format='json')
        with mock.patch.object(cache, 'set') as mock_cache_set:
            self.client.post(reverse('task-channelinfo'), {'channel_id': 'abc'}, format='json')
            self.assertFalse(mock_cache_set.called)

    @mock_patch_decorator
    def test_channel_info_404(self):
        mock_object = mock.Mock()
        mock_object.status_code = 404
        requests.get.return_value = mock_object
        response = self.client.post(reverse('task-channelinfo'), {'channel_id': 'abc'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def tearDown(self):
        cache.clear()
