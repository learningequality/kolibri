from __future__ import absolute_import, print_function, unicode_literals

import json

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.auth.models import Facility, DeviceOwner, FacilityUser


class ContextProcessorTestCase(APITestCase):

    def test_context_processor_anonymous_user(self):
        response = self.client.get(reverse('kolibri:setupwizardplugin:setupwizard'))
        self.assertEqual(json.loads(response.context['session'])['kind'], ['ANONYMOUS'])

    def test_context_processor_user(self):
        self.facility = Facility.objects.create(name="QQQ")
        DeviceOwner.objects.create(username="admin", password="***")
        self.user = FacilityUser.objects.create(username="foo", facility=self.facility)
        self.user.set_password("bar")
        self.user.save()
        self.client.login(username="foo", password="bar")
        response = self.client.get(reverse('kolibri:learnplugin:learn'))
        self.assertEqual(json.loads(response.context['session'])['username'], "foo")
