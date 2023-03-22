from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import mock
import requests
from django.urls import reverse
from rest_framework import status
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_201_CREATED
from rest_framework.test import APITestCase

from .. import models
from ..utils.network import connections
from .helpers import mock_request
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory


@mock.patch.object(requests.Session, "request", mock_request)
@mock.patch.object(connections, "check_if_port_open", lambda *a: True)
class NetworkLocationAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.learner = FacilityUserFactory(facility=cls.facility)
        cls.existing_happy_netloc = models.NetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/"
        )
        cls.existing_nonkolibri_netloc = models.NetworkLocation.objects.create(
            base_url="https://nonkolibrihappyurl.qqq/"
        )
        cls.existing_sad_netloc = models.NetworkLocation.objects.create(
            base_url="https://sadurl.qqq/"
        )

    def login(self, user):
        self.client.login(
            username=user.username, password=DUMMY_PASSWORD, facility=user.facility
        )

    def test_creating_good_address(self):
        self.login(self.superuser)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["base_url"], "https://kolibrihappyurl.qqq/")

    def test_creating_good_address_with_one_url_timing_out(self):
        self.login(self.superuser)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "timeoutonport80url.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["base_url"], "http://timeoutonport80url.qqq:8080/"
        )

    def test_creating_bad_address(self):
        self.login(self.superuser)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "nonkolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reading_network_location_list(self):
        self.login(self.superuser)
        response = self.client.get(reverse("kolibri:core:staticnetworklocation-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_read_network_location_list_as_anon_user(self):
        response = self.client.get(reverse("kolibri:core:staticnetworklocation-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_location_as_anon_user(self):
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reading_network_location_list_filter_soud(self):
        self.login(self.superuser)
        models.NetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            subset_of_users_device=True,
        )
        response = self.client.get(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"subset_of_users_device": False},
        )
        for location in response.data:
            self.assertFalse(location["subset_of_users_device"])


class PinnedDeviceAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory(facility=cls.facility)
        cls.network_location = models.NetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/"
        )

    def setUp(self):
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )

    def test_add_pinned_device(self):
        response = self.client.post(
            reverse("kolibri:core:pinned_devices-list"),
            data={"user": self.user.id, "device_id": self.network_location.id}
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)

    def test_fetch_pinned_devices(self):
        my_pin = models.PinnedDevice.objects.create(
            user=self.user,
            device_id=self.network_location.id
        )
        response = self.client.get(
            reverse("kolibri:core:pinned_devices-list"),
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        # TODO - Get this working
        #      - Discuss & write any more tasks
        #      - Start onto the frontend
        #self.assertEqual(response.data[0]['device_id'], my_pin.device_id)
        #self.assertTrue(my_pin in response.data)
