from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.auth.models import Facility, DeviceOwner

class KolibriTagNavigationTestCase(APITestCase):

    def test_redirect_to_setup_wizard(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get("location"), reverse('kolibri:setupwizardplugin:setupwizard'))

    def test_redirect_to_learn_root(self):
        Facility.objects.create(name="QQQ")
        DeviceOwner.objects.create(username="admin", password="***")
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get("location"), reverse('kolibri:learnplugin:learn'))
