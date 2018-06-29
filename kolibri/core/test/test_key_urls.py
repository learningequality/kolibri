from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.auth.test.helpers import create_superuser
from kolibri.auth.test.helpers import provision_device
from kolibri.auth.test.test_api import FacilityFactory

DUMMY_PASSWORD = "password"

class KolibriTagNavigationTestCase(APITestCase):

    def test_redirect_to_setup_wizard(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        url = reverse('kolibri:setupwizardplugin:setupwizard')
        try:
            content = str(response.content, 'utf-8')
        except TypeError:
            # Will throw TypeError on Py2 as str does not take additional argument
            content = response.content
        self.assertTrue('<meta http-equiv="refresh" content="0;URL=\'{url}\'" />'.format(url=url) in content)

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
