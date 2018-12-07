from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import mock
import requests
from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from .helpers import mock_request
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory


@mock.patch.object(requests.Session, 'get', mock_request)
class NetworkLocationAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.learner = FacilityUserFactory(facility=self.facility)
        self.existing_happy_netloc = models.NetworkLocation.objects.create(base_url="https://kolibrihappyurl.qqq/")
        self.existing_nonkolibri_netloc = models.NetworkLocation.objects.create(base_url="https://nonkolibrihappyurl.qqq/")
        self.existing_sad_netloc = models.NetworkLocation.objects.create(base_url="https://sadurl.qqq/")

    def login(self, user):
        self.client.login(username=user.username, password=DUMMY_PASSWORD, facility=user.facility)

    def test_creating_good_address(self):
        self.login(self.superuser)
        response = self.client.post(reverse("kolibri:core:networklocation-list"), data={"base_url": "kolibrihappyurl.qqq"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["device_name"], "skynet")
        self.assertEqual(response.data["instance_id"], "a" * 32)
        self.assertEqual(response.data["operating_system"], "windows")
        self.assertEqual(response.data["kolibri_version"], "0.11.0")
        self.assertEqual(response.data["available"], True)
        self.assertEqual(response.data["base_url"], "https://kolibrihappyurl.qqq/")

    def test_creating_good_address_with_one_url_timing_out(self):
        self.login(self.superuser)
        response = self.client.post(reverse("kolibri:core:networklocation-list"), data={"base_url": "timeoutonport80url.qqq"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["device_name"], "skynet")
        self.assertEqual(response.data["instance_id"], "a" * 32)
        self.assertEqual(response.data["operating_system"], "windows")
        self.assertEqual(response.data["kolibri_version"], "0.11.0")
        self.assertEqual(response.data["available"], True)
        self.assertEqual(response.data["base_url"], "http://timeoutonport80url.qqq:8080/")

    def test_creating_bad_address(self):
        self.login(self.superuser)
        response = self.client.post(reverse("kolibri:core:networklocation-list"), data={"base_url": "nonkolibrihappyurl.qqq"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reading_network_location_list(self):
        self.login(self.superuser)
        response = self.client.get(reverse("kolibri:core:networklocation-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for location in response.data:
            # only the happy location should be marked as available
            self.assertEqual(location["available"], location["id"] == self.existing_happy_netloc.id)

    def test_cannot_read_network_location_list_as_anon_user(self):
        response = self.client.get(reverse("kolibri:core:networklocation-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_read_network_location_list_as_learner(self):
        self.login(self.learner)
        response = self.client.get(reverse("kolibri:core:networklocation-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_location_as_anon_user(self):
        response = self.client.post(reverse("kolibri:core:networklocation-list"), data={"base_url": "kolibrihappyurl.qqq"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_location_as_learner(self):
        self.login(self.learner)
        response = self.client.post(reverse("kolibri:core:networklocation-list"), data={"base_url": "kolibrihappyurl.qqq"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
