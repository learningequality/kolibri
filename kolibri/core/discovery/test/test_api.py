import uuid

import mock
import requests
from django.urls import reverse
from rest_framework import status
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.test import APITestCase

from .. import models
from ..utils.network import connections
from .helpers import mock_request
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL
from kolibri.core.discovery.well_known import DATA_PORTAL_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import DATA_PORTAL_SYNCING_BASE_URL


@mock.patch.object(requests.Session, "request", mock_request)
@mock.patch.object(connections, "check_if_port_open", lambda *a: True)
class NetworkLocationAPITestCase(APITestCase):
    databases = "__all__"

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
        cls.kdp_reserved_location = models.NetworkLocation.objects.create(
            id=DATA_PORTAL_BASE_INSTANCE_ID,
            base_url=DATA_PORTAL_SYNCING_BASE_URL,
            location_type=models.LocationTypes.Reserved,
        )
        cls.studio_reserved_location = models.NetworkLocation.objects.create(
            id=CENTRAL_CONTENT_BASE_INSTANCE_ID,
            base_url=CENTRAL_CONTENT_BASE_URL,
            location_type=models.LocationTypes.Reserved,
        )
        cls.dynamic_location = models.DynamicNetworkLocation.objects.create(
            id="a" * 32,
            base_url="http://dynamiclocation.qqq",
            instance_id="a" * 32,
        )

    def login(self, user):
        self.client.login(
            username=user.username, password=DUMMY_PASSWORD, facility=user.facility
        )

    def assert_network_location_list(self, syncable_value, expected_ids):
        params = {"syncable": syncable_value} if syncable_value is not None else {}
        response = self.client.get(
            reverse("kolibri:core:networklocation-list"),
            params,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        location_ids = [location["id"] for location in response.data]
        self.assertCountEqual(location_ids, expected_ids)

    def test_get__pk(self):
        self.login(self.superuser)
        response = self.client.get(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.pk},
            )
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["base_url"], self.existing_happy_netloc.base_url)

    def test_get__instance_id(self):
        self.login(self.superuser)
        self.existing_happy_netloc.instance_id = uuid.uuid4().hex
        self.existing_happy_netloc.save()

        response = self.client.get(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.instance_id},
            )
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["base_url"], self.existing_happy_netloc.base_url)

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

    def test_return_kdp_reserved_location(self):
        """
        Tests the API for fetching dynamic, static, and KDP reserved network locations
        """
        self.login(self.superuser)
        expected_ids = [
            self.existing_happy_netloc.id,
            self.existing_nonkolibri_netloc.id,
            self.existing_sad_netloc.id,
            self.dynamic_location.id,
            self.kdp_reserved_location.id,
        ]
        self.assert_network_location_list("1", expected_ids)

    def test_return_studio_reserved_location(self):
        """
        Tests the API for fetching dynamic, static, and Studio reserved network locations
        """
        self.login(self.superuser)
        expected_ids = [
            self.existing_happy_netloc.id,
            self.existing_nonkolibri_netloc.id,
            self.existing_sad_netloc.id,
            self.dynamic_location.id,
            self.studio_reserved_location.id,
        ]
        self.assert_network_location_list("0", expected_ids)

    def test_return_no_reserved_locations(self):
        """
        Tests the API for fetching only dynamic and static network locations
        """
        self.login(self.superuser)
        expected_ids = [
            self.existing_happy_netloc.id,
            self.existing_nonkolibri_netloc.id,
            self.existing_sad_netloc.id,
            self.dynamic_location.id,
        ]
        self.assert_network_location_list(None, expected_ids)


class PinnedDeviceAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory(facility=cls.facility)
        cls.network_location = models.NetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/"
        )
        cls.network_location2 = models.NetworkLocation.objects.create(
            base_url="https://anotherone.moc"
        )
        cls.network_location3 = models.NetworkLocation.objects.create(
            base_url="https://anotherotherone.moc"
        )

    def setUp(self):
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )

    def test_add_pinned_device(self):
        """
        Tests the API for adding Pinned Devices
        """
        response = self.client.post(
            reverse("kolibri:core:pinned_devices-list"),
            data={"user": self.user.id, "instance_id": self.network_location.id},
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)

    def test_fetch_pinned_devices(self):
        """
        Tests the API for fetching Pinned Devices
        """
        my_pin = models.PinnedDevice.objects.create(
            user=self.user, instance_id=self.network_location.id
        )
        my_second_pin = models.PinnedDevice.objects.create(
            user=self.user, instance_id=self.network_location2.id
        )

        other_user = FacilityUserFactory(facility=self.facility)
        other_pin = models.PinnedDevice.objects.create(
            user=other_user, instance_id=self.network_location3.id
        )

        pin_ids = sorted([my_pin.instance_id, my_second_pin.instance_id])

        response = self.client.get(
            reverse("kolibri:core:pinned_devices-list"),
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        response_ids = sorted([item["instance_id"] for item in response.data])
        self.assertEqual(response_ids, pin_ids)
        self.assertNotIn(other_pin.instance_id, response_ids)

    def test_delete_own_pinned_devices(self):
        """
        Tests the API for deleting Pinned Devices
        """
        my_pin = models.PinnedDevice.objects.create(
            user=self.user, instance_id=self.network_location.id
        )

        response = self.client.delete(
            reverse("kolibri:core:pinned_devices-detail", kwargs={"pk": my_pin.id}),
        )
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

    def test_delete_other_pinned_devices(self):
        """
        Tests the API for deleting Pinned Devices
        """
        other_user = FacilityUserFactory(facility=self.facility)
        other_pin = models.PinnedDevice.objects.create(
            user=other_user, instance_id=self.network_location.id
        )

        response = self.client.delete(
            reverse("kolibri:core:pinned_devices-detail", kwargs={"pk": other_pin.id}),
        )
        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)
