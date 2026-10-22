import json
import os
import re
from typing import ClassVar

import pytest
from django.conf import settings as django_settings
from django.test import TestCase
from django.utils import translation
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import ValidationError

from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.device.login_tokens import login_tokens
from kolibri.core.device.login_tokens import OSUserInfo
from kolibri.core.device.models import DeviceAppKey
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.tasks import _os_user_default_names
from kolibri.core.device.tasks import DeviceProvisionValidator
from kolibri.core.device.tasks import provisiondevice
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import APP_KEY_COOKIE_NAME
from kolibri.plugins.utils.test.helpers import plugin_disabled


class DeviceProvisionTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()

    superuser_data: ClassVar[dict] = {"username": "superuser", "password": "password"}
    facility_data: ClassVar[dict] = {"name": "Wilson Elementary"}
    preset_data = "nonformal"
    dataset_data: ClassVar[dict] = {
        "learner_can_edit_username": True,
        "learner_can_edit_name": True,
        "learner_can_edit_password": True,
        "learner_can_sign_up": True,
        "learner_can_delete_account": True,
        "learner_can_login_with_no_password": False,
    }
    settings: ClassVar[dict] = {}
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

    def test_unnamed_facility_without_os_user_error(self):
        data = self._default_provision_data()
        data["facility"] = {}
        with pytest.raises(ValidationError):
            self._post_deviceprovision(data)
        self.assertFalse(Facility.objects.exists())

    def test_null_facility_without_facility_id_error(self):
        data = self._default_provision_data()
        data["facility"] = None
        with pytest.raises(ValidationError):
            self._post_deviceprovision(data)
        self.assertFalse(Facility.objects.exists())

    def test_missing_device_name_without_os_user_error(self):
        data = self._default_provision_data()
        del data["device_name"]
        with pytest.raises(ValidationError):
            self._post_deviceprovision(data)
        self.assertFalse(Facility.objects.exists())

    def test_osuser_superuser_error_no_app(self):
        with plugin_disabled("kolibri.plugins.app"):
            data = self._default_provision_data()
            del data["superuser"]
            with pytest.raises(ValidationError):
                self._post_deviceprovision(data)

    def _os_user_provision_data(self):
        data = self._default_provision_data()
        del data["superuser"]
        del data["device_name"]
        data["facility"] = {}
        return data

    def _os_user_token(self, full_name="Jane Doe"):
        return login_tokens.generate_for_user(
            OSUserInfo("jane", "jane", full_name, True)
        )

    def test_osuser_superuser_created(self):
        self._post_deviceprovision(
            self._os_user_provision_data(), auth_token=self._os_user_token()
        )
        self.assertEqual(
            DevicePermissions.objects.get(),
            FacilityUser.objects.get().devicepermissions,
        )
        self.assertTrue(FacilityUser.objects.get().os_user)
        self.assertFalse(DeviceSettings.objects.get().allow_other_browsers_to_connect)

    def test_osuser_names_device_facility_and_user(self):
        self._post_deviceprovision(
            self._os_user_provision_data(), auth_token=self._os_user_token()
        )
        self.assertEqual(
            DeviceSettings.objects.get().name, "Personal device for Jane Doe"
        )
        self.assertEqual(Facility.objects.get().name, "Home Facility for Jane Doe")
        self.assertEqual(FacilityUser.objects.get().full_name, "Jane Doe")

    def test_osuser_names_device_in_language(self):
        data = self._os_user_provision_data()
        data["language_id"] = "fr-fr"
        self._post_deviceprovision(data, auth_token=self._os_user_token())
        self.assertEqual(
            DeviceSettings.objects.get().name, "Appareil personnel pour Jane Doe"
        )

    def test_osuser_long_name_truncates_device_and_facility_names(self):
        self._post_deviceprovision(
            self._os_user_provision_data(),
            auth_token=self._os_user_token(full_name="J" * 120),
        )
        self.assertEqual(len(DeviceSettings.objects.get().name), 50)
        self.assertEqual(len(Facility.objects.get().name), 100)

    def test_osuser_sent_names_win(self):
        data = self._os_user_provision_data()
        data["device_name"] = "My laptop"
        data["facility"] = self.facility_data
        self._post_deviceprovision(data, auth_token=self._os_user_token())
        self.assertEqual(DeviceSettings.objects.get().name, "My laptop")
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_osuser_unknown_token_error(self):
        with pytest.raises(ParseError):
            self._post_deviceprovision(
                self._os_user_provision_data(), auth_token="unknown"
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


def _unquote_icu(message):
    return re.sub(r"'(\{[^}]*\})'", r"\1", message).replace("''", "'")


class OSUserDefaultNamesTranslationTestCase(TestCase):
    def test_backend_names_match_frontend_translations(self):
        locale_dir = django_settings.LOCALE_PATHS[0]
        os_user = OSUserInfo("jane", "jane", "{name}", False)
        for locale in sorted(os.listdir(locale_dir)):
            messages_path = os.path.join(
                locale_dir,
                locale,
                "LC_MESSAGES",
                "kolibri.plugins.setup_wizard.app-messages.json",
            )
            # ach_UG holds Crowdin pseudo-IDs, not translations
            if locale == "ach_UG" or not os.path.exists(messages_path):
                continue
            with open(messages_path, encoding="utf-8") as f:
                messages = json.load(f)
            with self.subTest(locale=locale), translation.override(
                translation.to_language(locale)
            ):
                self.assertEqual(
                    _os_user_default_names(os_user),
                    (
                        _unquote_icu(messages["SettingUpKolibri.onMyOwnDeviceName"]),
                        _unquote_icu(messages["SettingUpKolibri.onMyOwnFacilityName"]),
                    ),
                )
