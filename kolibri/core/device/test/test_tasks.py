from unittest import mock

import pytest
from django.test import TestCase
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import ValidationError

from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.tasks import DeviceProvisionValidator
from kolibri.core.device.tasks import provisiondevice
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import app_initialize_url
from kolibri.core.device.utils import APP_KEY_COOKIE_NAME
from kolibri.plugins.utils.test.helpers import plugin_disabled


class DeviceProvisionTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()

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

    def _default_provision_data(self):
        return {
            "type": "kolibri.core.device.tasks.provisiondevice",
            "device_name": None,
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "settings": self.settings,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }

    def _post_deviceprovision(self, data, auth_token=None):
        request = None
        if auth_token:
            from kolibri.core.device.models import DeviceAppKey

            app_key = DeviceAppKey.get_app_key()

            request = type("Request", (object,), {"COOKIES": {}})()
            request.COOKIES[APP_AUTH_TOKEN_COOKIE_NAME] = auth_token
            request.COOKIES[APP_KEY_COOKIE_NAME] = app_key

        serializer = DeviceProvisionValidator(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        return provisiondevice(**validated_data["kwargs"])

    def test_personal_setup_defaults(self):
        data = self._default_provision_data()
        data["preset"] = "informal"
        # Client should pass an empty Dict for settings
        data["settings"] = {}
        self._post_deviceprovision(data)
        settings = FacilityDataset.objects.get()
        self.assertEqual(settings.learner_can_edit_username, True)
        self.assertEqual(settings.learner_can_edit_name, True)
        self.assertEqual(settings.learner_can_edit_password, True)
        self.assertEqual(settings.learner_can_sign_up, True)
        self.assertEqual(settings.learner_can_delete_account, True)
        self.assertEqual(settings.learner_can_login_with_no_password, False)
        self.assertEqual(settings.show_download_button_in_learn, True)

        device_settings = DeviceSettings.objects.get()
        self.assertEqual(device_settings.allow_guest_access, True)

    def test_superuser_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(
            FacilityUser.objects.get().username, self.superuser_data["username"]
        )

    def test_superuser_password_set_correctly(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertTrue(
            FacilityUser.objects.get().check_password(self.superuser_data["password"])
        )

    def test_superuser_device_permissions_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(
            DevicePermissions.objects.get(),
            FacilityUser.objects.get().devicepermissions,
        )

    def test_facility_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_admin_role_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Role.objects.get().kind, ADMIN)

    def test_facility_role_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Role.objects.get().collection.name, self.facility_data["name"])

    def test_dataset_set_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
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
        data = self._default_provision_data()
        self.assertEqual(DeviceSettings.objects.count(), 0)
        self._post_deviceprovision(data)
        self.assertEqual(DeviceSettings.objects.count(), 1)

    def test_device_settings_values(self):
        data = self._default_provision_data()
        data["allow_guest_access"] = False
        self._post_deviceprovision(data)
        device_settings = DeviceSettings.objects.get()
        self.assertEqual(device_settings.default_facility, Facility.objects.get())
        self.assertFalse(device_settings.allow_guest_access)
        self.assertFalse(device_settings.allow_peer_unlisted_channel_import)
        self.assertTrue(device_settings.allow_learner_unassigned_resource_access)

    def test_create_superuser_error(self):
        data = self._default_provision_data()
        data.update({"superuser": {}})
        with pytest.raises(ValidationError):
            self._post_deviceprovision(data)

    def test_osuser_superuser_error_no_app(self):
        with plugin_disabled("kolibri.plugins.app"):
            data = self._default_provision_data()
            del data["superuser"]
            with pytest.raises(ValidationError):
                self._post_deviceprovision(data)

    def test_osuser_superuser_created(self):
        with mock.patch(
            "kolibri.core.device.tasks.GetOSUserHook", autospec=True
        ) as mock_hook1, mock.patch(
            "kolibri.core.auth.models.GetOSUserHook"
        ) as mock_hook2:
            mock_hook1.is_registered = mock_hook2.is_registered = True
            mock_hook2.retrieve_os_user.return_value = ("test_os_user", True)
            initialize_url = app_initialize_url(auth_token="test")
            self.client.get(initialize_url)
            data = self._default_provision_data()
            del data["superuser"]
            self._post_deviceprovision(data, auth_token="test")
            self.client.get(initialize_url)
            self.assertEqual(
                DevicePermissions.objects.get(),
                FacilityUser.objects.get().devicepermissions,
            )
            self.assertTrue(FacilityUser.objects.get().os_user)
            self.assertFalse(
                DeviceSettings.objects.get().allow_other_browsers_to_connect
            )

    def test_imported_facility_no_update(self):
        facility = Facility.objects.create(name="This is a test")
        settings = FacilityDataset.objects.get()
        settings.learner_can_edit_username = True
        settings.save()
        data = self._default_provision_data()
        data["facility_id"] = facility.id
        del data["facility"]
        # Client should pass an empty Dict for settings
        data["settings"] = {
            "learner_can_edit_username": False,
            "on_my_own_setup": True,
        }
        settings.refresh_from_db()
        facility.refresh_from_db()
        self._post_deviceprovision(data)
        self.assertEqual(settings.learner_can_edit_username, True)
        self.assertEqual(facility.on_my_own_setup, False)

    def test_imported_facility_with_fake_facility_id(self):
        data = self._default_provision_data()
        # Fake facility_id
        data["facility_id"] = "12345678123456781234567812345678"
        del data["facility"]
        with pytest.raises(ParseError):
            self._post_deviceprovision(data)

    def test_imported_facility_with_no_facility_data(self):
        data = self._default_provision_data()
        # Try to create facility with no data
        data["facility_id"] = None
        del data["facility"]
        with pytest.raises(ParseError):
            self._post_deviceprovision(data)
