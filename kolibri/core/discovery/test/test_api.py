import datetime
import uuid
from typing import ClassVar
from unittest import mock

import requests
from django.db.utils import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL
from kolibri.core.discovery.well_known import DATA_PORTAL_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import DATA_PORTAL_SYNCING_BASE_URL

from .. import models
from ..utils.network import connections
from .helpers import info
from .helpers import mock_happy_no_os_request
from .helpers import mock_request
from .helpers import mock_response

# Differs from the dynamic location's instance_id in the test case setup, so no
# location has an `id` equal to it.
SHARED_INSTANCE_ID = "c" * 32


def mock_peer_request(instance_id):
    def request(session, method, url, *args, **kwargs):
        response = mock_response(200)
        response.json.return_value = {**info, "instance_id": instance_id}
        response.url = url
        return response

    return request


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
        cls.kdp_reserved_location, _ = models.NetworkLocation.objects.get_or_create(
            id=DATA_PORTAL_BASE_INSTANCE_ID,
            defaults={
                "base_url": DATA_PORTAL_SYNCING_BASE_URL,
                "location_type": models.LocationTypes.Reserved,
            },
        )
        cls.studio_reserved_location, _ = models.NetworkLocation.objects.get_or_create(
            id=CENTRAL_CONTENT_BASE_INSTANCE_ID,
            defaults={
                "base_url": CENTRAL_CONTENT_BASE_URL,
                "location_type": models.LocationTypes.Reserved,
            },
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

    def _create_static_locations_sharing_instance_id(self):
        """
        Creates two static locations sharing an instance_id. The older one
        deliberately has the higher `id`, so that selecting by oldest `added`
        differs from selecting by lowest `id`.
        """
        older = models.StaticNetworkLocation.objects.create(
            id="f" * 32,
            base_url="http://older-address.qqq/",
            instance_id=SHARED_INSTANCE_ID,
        )
        newer = models.StaticNetworkLocation.objects.create(
            id="1" * 32,
            base_url="http://newer-address.qqq/",
            instance_id=SHARED_INSTANCE_ID,
        )
        models.NetworkLocation.objects.filter(pk=older.pk).update(
            added=timezone.now() - datetime.timedelta(days=1)
        )
        return older, newer

    def _get_shared_instance_id_location(self):
        return self.client.get(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": SHARED_INSTANCE_ID},
            )
        )

    def _update_shared_instance_id_connection_status(self):
        with mock.patch.object(
            requests.Session,
            "request",
            mock_peer_request(SHARED_INSTANCE_ID),
        ):
            return self.client.post(
                reverse(
                    "kolibri:core:networklocation-update-connection-status",
                    args=[SHARED_INSTANCE_ID],
                ),
            )

    def test_get__instance_id_shared_by_multiple_locations(self):
        self.login(self.superuser)
        older, _ = self._create_static_locations_sharing_instance_id()

        response = self._get_shared_instance_id_location()

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["id"], older.id)

    def test_get__shared_instance_id_selection_is_repeatable(self):
        self.login(self.superuser)
        older, _ = self._create_static_locations_sharing_instance_id()

        selected_ids = [
            self._get_shared_instance_id_location().data["id"] for _ in range(3)
        ]

        self.assertEqual(selected_ids, [older.id] * 3)

    def test_get__shared_instance_id_ties_on_added_broken_by_id(self):
        self.login(self.superuser)
        higher_id, lower_id = self._create_static_locations_sharing_instance_id()
        models.NetworkLocation.objects.filter(
            pk__in=[higher_id.pk, lower_id.pk]
        ).update(added=timezone.now())

        response = self._get_shared_instance_id_location()

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["id"], lower_id.id)

    def test_get__id_match_takes_priority_over_instance_id_match(self):
        self.login(self.superuser)
        self._create_static_locations_sharing_instance_id()
        # Newest of all, and its instance_id differs, but its id is what is requested.
        id_match = models.StaticNetworkLocation.objects.create(
            id=SHARED_INSTANCE_ID,
            base_url="http://id-match.qqq/",
            instance_id="d" * 32,
        )

        response = self._get_shared_instance_id_location()

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["id"], id_match.id)

    def test_update_connection_status__instance_id_shared_by_multiple_locations(self):
        self.login(self.superuser)
        older, newer = self._create_static_locations_sharing_instance_id()

        response = self._update_shared_instance_id_connection_status()

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["id"], older.id)
        self.assertEqual(
            response.data["connection_status"], models.ConnectionStatus.Okay
        )
        older.refresh_from_db()
        newer.refresh_from_db()
        self.assertEqual(older.connection_status, models.ConnectionStatus.Okay)
        self.assertEqual(newer.connection_status, models.ConnectionStatus.Unknown)
        self.assertEqual(newer.base_url, "http://newer-address.qqq/")

    def test_update_connection_status__shared_instance_id_selection_is_repeatable(
        self,
    ):
        self.login(self.superuser)
        older, _ = self._create_static_locations_sharing_instance_id()

        first = self._update_shared_instance_id_connection_status()
        # The first update changed the selected record's status; it must still be
        # the one selected next time.
        second = self._update_shared_instance_id_connection_status()

        self.assertEqual(first.data["id"], older.id)
        self.assertEqual(second.data["id"], older.id)

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

    def test_patch_without_base_url_updates_only_nickname(self):
        self.login(self.superuser)
        # last_accessed is auto_now, so every save updates it
        fields = [
            f.name
            for f in models.NetworkLocation._meta.concrete_fields
            if f.name != "last_accessed"
        ]
        before = models.NetworkLocation.objects.filter(
            pk=self.existing_happy_netloc.pk
        ).values(*fields)[0]
        response = self.client.patch(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.pk},
            ),
            data={"nickname": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        after = models.NetworkLocation.objects.filter(
            pk=self.existing_happy_netloc.pk
        ).values(*fields)[0]
        self.assertEqual(after, {**before, "nickname": "x"})

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

    def test_learner_cannot_create_location(self):
        self.login(self.learner)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_learner_cannot_update_location(self):
        self.login(self.learner)
        response = self.client.put(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.pk},
            ),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_learner_cannot_delete_location(self):
        self.login(self.learner)
        response = self.client.delete(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.pk},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(
            models.NetworkLocation.objects.filter(
                pk=self.existing_happy_netloc.pk
            ).exists()
        )

    def test_learner_can_read_location(self):
        self.login(self.learner)
        response = self.client.get(
            reverse(
                "kolibri:core:staticnetworklocation-detail",
                kwargs={"pk": self.existing_happy_netloc.pk},
            )
        )
        self.assertEqual(response.status_code, HTTP_200_OK)

    def test_learner_can_update_connection_status(self):
        self.login(self.learner)
        response = self.client.post(
            reverse(
                "kolibri:core:networklocation-update-connection-status",
                args=[self.existing_happy_netloc.id],
            ),
        )
        self.assertEqual(response.status_code, HTTP_200_OK)

    def test_facility_admin_can_create_location(self):
        admin = FacilityUserFactory(facility=self.facility)
        self.facility.add_admin(admin)
        self.login(admin)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_content_manager_can_create_location(self):
        content_manager = FacilityUserFactory(facility=self.facility)
        DevicePermissions.objects.create(user=content_manager, can_manage_content=True)
        self.login(content_manager)
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

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

    def test_update_connection_status(self):
        studio_non_reserved_location = models.NetworkLocation.objects.create(
            base_url=CENTRAL_CONTENT_BASE_URL,
        )

        with mock.patch.object(
            requests.Session,
            "request",
            mock_happy_no_os_request("https://happyurl.qqq/"),
        ):
            self.login(self.superuser)
            try:
                self.client.post(
                    reverse(
                        "kolibri:core:networklocation-update-connection-status",
                        args=[studio_non_reserved_location.id],
                    ),
                )
            except IntegrityError as e:
                self.fail(
                    f"NetworkLocation.operating_system has no default value set: {e}"
                )


@mock.patch.object(requests.Session, "request", mock_request)
class UnprovisionedNetworkLocationAPITestCase(APITestCase):
    databases = "__all__"

    def test_anon_user_can_create_location(self):
        response = self.client.post(
            reverse("kolibri:core:staticnetworklocation-list"),
            data={"base_url": "kolibrihappyurl.qqq"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class NetworkLocationFacilitiesViewTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.peer = models.StaticNetworkLocation.objects.create(
            base_url="http://peer.example/",
            instance_id="b" * 32,
        )

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    valid_facility: ClassVar[dict] = {
        "id": "00000000000000000000000000000003",
        "dataset": "00000000000000000000000000000004",
        "name": "Peer Facility",
        "learner_can_login_with_no_password": False,
        "learner_can_sign_up": True,
        "on_my_own_setup": False,
        "picture_password_settings": {
            "icon_style": "standard",
            "show_icon_text": True,
        },
    }

    def _retrieve(self, payload):
        with mock.patch(
            "kolibri.core.discovery.viewsets.network_location.NetworkClient"
        ) as NetworkClient:
            client = NetworkClient.build_from_network_location.return_value.__enter__.return_value
            client.base_url = self.peer.base_url
            client.get.return_value.json.return_value = payload
            return self.client.get(
                reverse(
                    "kolibri:core:networklocation_facilities-detail",
                    kwargs={"pk": self.peer.id},
                )
            )

    def test_well_formed_response_passes_through(self):
        response = self._retrieve([self.valid_facility])
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.data["facilities"], [self.valid_facility])

    def test_null_picture_password_settings_passes_through(self):
        payload = [dict(self.valid_facility, picture_password_settings=None)]
        response = self._retrieve(payload)
        self.assertEqual(response.data["facilities"], payload)

    def test_facility_from_a_pre_0_16_peer_is_listed(self):
        added_after_0_15 = {
            "learner_can_sign_up": False,
            "on_my_own_setup": False,
            "picture_password_settings": None,
        }
        pre_0_16 = {
            k: v for k, v in self.valid_facility.items() if k not in added_after_0_15
        }
        response = self._retrieve([pre_0_16])
        self.assertEqual(
            response.data["facilities"],
            [dict(pre_0_16, **added_after_0_15)],
        )

    def test_extra_keys_are_stripped(self):
        smuggled = dict(self.valid_facility, smuggled="AKIA...", token="leaked")
        response = self._retrieve([smuggled])
        self.assertEqual(response.data["facilities"], [self.valid_facility])

    def test_extra_keys_inside_picture_password_settings_are_stripped(self):
        smuggled = dict(
            self.valid_facility,
            picture_password_settings={
                "icon_style": "standard",
                "show_icon_text": True,
                "smuggled": "AKIA...",
            },
        )
        response = self._retrieve([smuggled])
        self.assertEqual(response.data["facilities"], [self.valid_facility])

    def test_non_list_response_yields_empty_facilities(self):
        response = self._retrieve({"my_secret": "AKIA..."})
        self.assertEqual(response.data["facilities"], [])

    def test_invalid_item_is_dropped_and_valid_items_kept(self):
        response = self._retrieve([self.valid_facility, "not a dict"])
        self.assertEqual(response.data["facilities"], [self.valid_facility])

    def test_invalid_uuid_id_is_dropped(self):
        bad = dict(self.valid_facility, id="not-a-uuid")
        response = self._retrieve([bad])
        self.assertEqual(response.data["facilities"], [])

    def test_invalid_picture_password_icon_style_is_dropped(self):
        bad = dict(
            self.valid_facility,
            picture_password_settings={
                "icon_style": "rogue",
                "show_icon_text": True,
            },
        )
        response = self._retrieve([bad])
        self.assertEqual(response.data["facilities"], [])


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

    def test_fetch_pinned_device_response_includes_id(self):
        my_pin = models.PinnedDevice.objects.create(
            user=self.user, instance_id=self.network_location.id
        )
        response = self.client.get(
            reverse("kolibri:core:pinned_devices-list"),
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertIn("id", item)
        self.assertEqual(item["id"], my_pin.id)

    def test_adding_duplicate_pinned_device_returns_400(self):
        response = self.client.post(
            reverse("kolibri:core:pinned_devices-list"),
            data={"user": self.user.id, "instance_id": self.network_location.id},
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)

        response = self.client.post(
            reverse("kolibri:core:pinned_devices-list"),
            data={"user": self.user.id, "instance_id": self.network_location.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            models.PinnedDevice.objects.filter(
                user=self.user, instance_id=self.network_location.id
            ).count(),
            1,
        )

    def test_update_pinned_device_with_own_instance_id_returns_200(self):
        pin = models.PinnedDevice.objects.create(
            user=self.user, instance_id=self.network_location.id
        )
        response = self.client.put(
            reverse(
                "kolibri:core:pinned_devices-detail",
                kwargs={"pk": pin.id},
            ),
            data={"instance_id": self.network_location.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
