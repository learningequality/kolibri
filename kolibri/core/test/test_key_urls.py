from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.auth.test.test_api import FacilityFactory

from kolibri.auth.test.helpers import create_superuser, provision_device

DUMMY_PASSWORD = "password"

class KolibriTagNavigationTestCase(APITestCase):

    def test_redirect_to_setup_wizard(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get("location"), reverse('kolibri:setupwizardplugin:setupwizard'))

    def test_redirect_root_to_user_if_not_logged_in(self):
        provision_device()
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get("location"), reverse('kolibri:user:user'))

    def test_redirect_root_to_learn_if_logged_in(self):
        facility = FacilityFactory.create()
        do = create_superuser(facility)
        provision_device()
        self.client.login(username=do.username, password=DUMMY_PASSWORD)
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.get("location"), reverse('kolibri:learnplugin:learn'))
