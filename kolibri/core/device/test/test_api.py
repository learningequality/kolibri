import os
import platform
import sys
from collections import namedtuple

import mock
from django.conf import settings
from django.core.urlresolvers import reverse
from mock import patch
from morango.models import DatabaseIDModel
from morango.models import InstanceIDModel
from rest_framework import status
from rest_framework.test import APITestCase

import kolibri
from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings

DUMMY_PASSWORD = "password"


class DeviceProvisionTestCase(APITestCase):

    superuser_data = {"username": "superuser", "password": "password"}
    facility_data = {"name": "Wilson Elementary"}
    preset_data = "nonformal"
    dataset_data = {
        "learner_can_edit_username": True,
        "learner_can_edit_name": True,
        "learner_can_edit_password": True,
        "learner_can_sign_up": True,
        "learner_can_delete_account": True,
        "learner_can_login_with_no_password": False,
    }
    settings = {}
    allow_guest_access = True

    language_id = "en"

    def test_cannot_post_if_provisioned(self):
        provision_device()
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "settings": self.settings,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        response = self.client.post(
            reverse("kolibri:core:deviceprovision"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "settings": self.settings,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(
            FacilityUser.objects.get().username, self.superuser_data["username"]
        )

    def test_superuser_password_set_correctly(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertTrue(
            FacilityUser.objects.get().check_password(self.superuser_data["password"])
        )

    def test_superuser_device_permissions_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(
            DevicePermissions.objects.get(),
            FacilityUser.objects.get().devicepermissions,
        )

    def test_facility_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_admin_role_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(Role.objects.get().kind, ADMIN)

    def test_facility_role_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(Role.objects.get().collection.name, self.facility_data["name"])

    def test_dataset_set_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_username,
            self.dataset_data["learner_can_edit_username"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_name,
            self.dataset_data["learner_can_edit_name"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_password,
            self.dataset_data["learner_can_edit_password"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_sign_up,
            self.dataset_data["learner_can_sign_up"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_delete_account,
            self.dataset_data["learner_can_delete_account"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_login_with_no_password,
            self.dataset_data["learner_can_login_with_no_password"],
        )

    def test_device_settings_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }
        self.assertEqual(DeviceSettings.objects.count(), 0)
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        self.assertEqual(DeviceSettings.objects.count(), 1)

    def test_device_settings_values(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "settings": self.settings,
            "preset": self.preset_data,
            "language_id": self.language_id,
            "allow_guest_access": False,
        }
        self.client.post(reverse("kolibri:core:deviceprovision"), data, format="json")
        device_settings = DeviceSettings.objects.get()
        self.assertEqual(device_settings.default_facility, Facility.objects.get())
        self.assertFalse(device_settings.allow_guest_access)
        self.assertFalse(device_settings.allow_peer_unlisted_channel_import)
        self.assertTrue(device_settings.allow_learner_unassigned_resource_access)


class DeviceSettingsTestCase(APITestCase):
    settings = {
        "language_id": "en",
        "allow_guest_access": False,
        "allow_peer_unlisted_channel_import": True,
        "allow_learner_unassigned_resource_access": False,
    }

    def setUp(self):
        super(DeviceSettingsTestCase, self).setUp()
        self.facility = FacilityFactory.create()
        provision_device(language_id="es", default_facility=self.facility)
        self.superuser = create_superuser(self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_post(self):
        response = self.client.post(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_cannot_put(self):
        response = self.client.put(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch(self):
        device_settings = DeviceSettings.objects.get()
        self.assertEqual("es", device_settings.language_id)
        self.assertTrue(device_settings.allow_guest_access)
        self.assertFalse(device_settings.allow_peer_unlisted_channel_import)
        self.assertTrue(device_settings.allow_learner_unassigned_resource_access)

        self.client.patch(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        device_settings.refresh_from_db()

        self.assertEqual("en", device_settings.language_id)
        self.assertFalse(device_settings.allow_guest_access)
        self.assertTrue(device_settings.allow_peer_unlisted_channel_import)
        self.assertFalse(device_settings.allow_learner_unassigned_resource_access)


class DevicePermissionsTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_superuser_delete_own_permissions(self):
        response = self.client.delete(
            reverse(
                "kolibri:core:devicepermissions-detail",
                kwargs={"pk": self.superuser.devicepermissions.pk},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_superuser_update_own_permissions(self):
        response = self.client.patch(
            reverse(
                "kolibri:core:devicepermissions-detail",
                kwargs={"pk": self.superuser.devicepermissions.pk},
            ),
            {"is_superuser": False},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class FreeSpaceTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_posix_freespace(self):
        if not sys.platform.startswith("win"):
            with mock.patch("kolibri.utils.system.os.statvfs") as os_statvfs_mock:
                statvfs_result = namedtuple("statvfs_result", ["f_frsize", "f_bavail"])
                os_statvfs_mock.return_value = statvfs_result(f_frsize=1, f_bavail=2)

                response = self.client.get(
                    reverse("kolibri:core:freespace"), {"path": "test"}
                )

                os_statvfs_mock.assert_called_with(os.path.realpath("test"))
                self.assertEqual(response.data, {"freespace": 2})

    def test_win_freespace_fail(self):
        if sys.platform.startswith("win"):
            ctypes_mock = mock.MagicMock()
            with mock.patch.dict("sys.modules", ctypes=ctypes_mock):
                ctypes_mock.windll.kernel32.GetDiskFreeSpaceExW.return_value = 0
                ctypes_mock.winError.side_effect = OSError
                try:
                    self.client.get(reverse("kolibri:core:freespace"), {"path": "test"})
                except OSError:
                    # check if ctypes.winError() has been called
                    ctypes_mock.winError.assert_called_with()


class DeviceInfoTestCase(APITestCase):
    def setUp(self):
        provision_device()
        DatabaseIDModel.objects.create()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_has_version(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.data["version"], kolibri.__version__)

    def test_urls(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertFalse(len(response.data["urls"]) == 0)
        for url in response.data["urls"]:
            # Make sure each url is a valid link
            self.assertTrue(url.startswith("http://"))

    @patch(
        "kolibri.core.device.api.get_urls",
        return_value=(1, ["http://127.0.0.1:8000", "http://kolibri.com"]),
    )
    def test_no_localhost_urls_when_others_available(self, get_urls_mock):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(len(response.data["urls"]), 1)
        self.assertEqual(response.data["urls"][0], "http://kolibri.com")

    @patch(
        "kolibri.core.device.api.get_urls", return_value=(1, ["http://127.0.0.1:8000"])
    )
    def test_localhost_urls_when_no_others_available(self, get_urls_mock):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(len(response.data["urls"]), 1)
        self.assertEqual(response.data["urls"][0], "http://127.0.0.1:8000")

    def test_database_path(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        if settings.DATABASES["default"]["ENGINE"].endswith("sqlite3"):
            self.assertEqual(
                response.data["database_path"], settings.DATABASES["default"]["NAME"]
            )
        else:
            self.assertTrue("database_path" not in response.data)

    def test_device_name(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.data["device_name"], platform.node())

    def test_os(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.data["os"], platform.platform())

    def test_device_id(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(
            response.data["device_id"],
            InstanceIDModel.get_or_create_current_instance()[0].id,
        )

    def test_time_zone(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertTrue(response.data["server_timezone"], settings.TIME_ZONE)

    def test_free_space(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(type(response.data["content_storage_free_space"]), int)

    def test_superuser_permissions(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 200)

    def test_user_permissions(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.logout()
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 403)

    def test_user_with_permissions(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        DevicePermissions.objects.create(user=self.user, can_manage_content=True)
        self.client.logout()
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 200)
