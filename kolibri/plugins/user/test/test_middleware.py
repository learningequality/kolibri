from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import setup_device


class UserRedirectMiddlewareTest(APITestCase):

    def setUp(self):
        self.facility, self.superuser = setup_device()
        self.dataset = self.facility.dataset
        self.dataset.allow_guest_access = False
        self.dataset.save()

    def test_redirect_to_signin_page(self):
        response = self.client.get(reverse('facilityuser-list'))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get('location'), reverse('kolibri:user:user'))

    def test_no_redirect_when_signed_in(self):
        self.client.login(username=self.superuser.username, password='password')
        response = self.client.get(reverse('facilityuser-list'))
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.get('location'), reverse('kolibri:user:user'))

    def test_no_redirect_to_signin_page(self):
        self.dataset.allow_guest_access = True
        self.dataset.save()
        response = self.client.get(reverse('kolibri:learnplugin:learn'))
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.get('location'), reverse('kolibri:user:user'))
