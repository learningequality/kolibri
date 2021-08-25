from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json
import os
import tempfile

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase

from ..models import DeviceSettings
from kolibri.core.auth.constants.facility_presets import mappings
from kolibri.core.auth.constants.facility_presets import presets
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.device.utils import create_facility
from kolibri.core.device.utils import LANDING_PAGE_LEARN
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_from_file
from kolibri.core.device.utils import setup_device_and_facility


class DeviceProvisionTestCase(TestCase):
    """
    Tests for functions used in provisiondevice command.
    """

    def setUp(self):
        clear_process_cache()

    def test_create_facility(self):
        create_facility(facility_name="test")
        self.assertTrue(Facility.objects.filter(name="test").exists())

    def test_create_facility_set_preset(self):
        preset = list(presets.keys())[0]
        facility = create_facility(facility_name="test", preset=preset)
        dataset_data = mappings[preset]
        for key, value in dataset_data.items():
            self.assertEqual(getattr(facility.dataset, key), value)

    def test_no_facility_return_default(self):
        setup_device()
        default_facility = Facility.get_default_facility()
        self.assertIsNotNone(default_facility)
        setup_device_and_facility(None, None, None, None, {}, None, None)
        self.assertEqual(Facility.objects.all().count(), 1)

    def test_create_device_settings_provisioned(self):
        facility = Facility.objects.create(name="Test")
        provision_device(language_id="en", default_facility=facility)
        self.assertTrue(DeviceSettings.objects.get().is_provisioned)

    def test_create_device_settings_language(self):
        facility = Facility.objects.create(name="Test")
        provision_device(language_id="en", default_facility=facility)
        self.assertEqual(DeviceSettings.objects.get().language_id, "en")

    def test_create_device_settings_default_facility(self):
        facility = Facility.objects.create(name="Test")
        provision_device(language_id="en", default_facility=facility)
        self.assertEqual(DeviceSettings.objects.get().default_facility, facility)


class DeviceProvisionCommandTestCase(TestCase):
    """
    Tests for provisiondevice command.
    """

    def setUp(self):
        self.preset = list(presets.keys())[0]
        call_command(
            "provisiondevice",
            facility="test",
            superusername="testuser",
            superuserpassword="test",
            preset=self.preset,
            language_id="en",
        )

    def test_create_facility(self):
        self.assertTrue(Facility.objects.filter(name="test").exists())

    def test_create_facility_set_preset(self):
        default_facility = Facility.get_default_facility()
        dataset_data = mappings[self.preset]
        for key, value in dataset_data.items():
            self.assertEqual(getattr(default_facility.dataset, key), value)

    def test_create_super_user(self):
        self.assertTrue(FacilityUser.objects.get(username="testuser").is_superuser)

    def test_create_device_settings_provisioned(self):
        self.assertTrue(DeviceSettings.objects.get().is_provisioned)

    def test_create_device_settings_language(self):
        self.assertEqual(DeviceSettings.objects.get().language_id, "en")

    def test_create_device_settings_default_facility(self):
        default_facility = Facility.get_default_facility()
        self.assertEqual(
            DeviceSettings.objects.get().default_facility, default_facility
        )


class DeviceProvisionFileTestCase(TestCase):
    """
    Tests for provisioning a device from a JSON file.
    """

    @classmethod
    def setUpTestData(cls):
        clear_process_cache()
        file_handle, file_path = tempfile.mkstemp(suffix=".json")
        os.close(file_handle)
        cls.provision_file = file_path
        cls.provisioning = {
            "facility_name": "My Facility",
            "facility_settings": {
                "learner_can_edit_username": False,
                "learner_can_edit_name": False,
                "learner_can_edit_password": False,
                "learner_can_sign_up": False,
                "learner_can_delete_account": False,
                "learner_can_login_with_no_password": False,
                "show_download_button_in_learn": False,
            },
            "device_settings": {
                "language_id": "en",
                "landing_page": LANDING_PAGE_LEARN,
                "allow_guest_access": False,
                "allow_peer_unlisted_channel_import": False,
                "allow_learner_unassigned_resource_access": False,
                "name": "My Device",
                "allow_other_browsers_to_connect": False,
            },
            "superuser": {"username": "provisioned_superuser", "password": "password"},
        }
        json.dump(cls.provisioning, open(cls.provision_file, "w"))
        provision_from_file(cls.provision_file)

    def test_create_facility(self):
        self.assertTrue(
            Facility.objects.filter(name=self.provisioning["facility_name"]).exists()
        )

    def test_create_facility_set_settings(self):
        default_facility = Facility.get_default_facility()
        dataset_data = self.provisioning["facility_settings"]
        for key, value in dataset_data.items():
            self.assertEqual(getattr(default_facility.dataset, key), value)

    def test_create_super_user(self):
        self.assertTrue(
            FacilityUser.objects.get(
                username=self.provisioning["superuser"]["username"]
            ).is_superuser
        )

    def test_create_device_set_settings(self):
        device_settings = DeviceSettings.objects.get()
        dataset_data = self.provisioning["device_settings"]
        for key, value in dataset_data.items():
            self.assertEqual(getattr(device_settings, key), value)

    def test_create_device_settings_provisioned(self):
        self.assertTrue(DeviceSettings.objects.get().is_provisioned)

    def test_create_device_settings_default_facility(self):
        default_facility = Facility.get_default_facility()
        self.assertEqual(
            DeviceSettings.objects.get().default_facility, default_facility
        )

    def test_file_removed(self):
        self.assertFalse(os.path.exists(self.provision_file))


class DeviceProvisionFileUnhappyTestCase(TestCase):
    """
    Tests for provisioning a device from a JSON file.
    To ensure that validation errors are appropriately thrown.
    """

    def setUp(self):
        file_handle, file_path = tempfile.mkstemp(suffix=".json")
        os.close(file_handle)
        self.provision_file = file_path
        self.provisioning = {
            "facility_name": "My Facility",
            "facility_settings": {
                "learner_can_edit_username": False,
                "learner_can_edit_name": False,
                "learner_can_edit_password": False,
                "learner_can_sign_up": False,
                "learner_can_delete_account": False,
                "learner_can_login_with_no_password": False,
                "show_download_button_in_learn": False,
            },
            "device_settings": {
                "language_id": "en",
                "landing_page": LANDING_PAGE_LEARN,
                "allow_guest_access": False,
                "allow_peer_unlisted_channel_import": False,
                "allow_learner_unassigned_resource_access": False,
                "name": "My Device",
                "allow_other_browsers_to_connect": False,
            },
            "superuser": {"username": "provisioned_superuser", "password": "password"},
        }

    def provision(self):
        clear_process_cache()
        json.dump(self.provisioning, open(self.provision_file, "w"))
        provision_from_file(self.provision_file)

    def test_provisioned_raises_error(self):
        facility = Facility.objects.create(name="Test")
        provision_device(language_id="en", default_facility=facility)
        with self.assertRaises(ValidationError):
            self.provision()

    def test_nofile_raises_error(self):
        with self.assertRaises(ValidationError):
            provision_from_file("non-existent-file.json")

    def test_bad_device_settings_raises_error(self):
        self.provisioning["device_settings"]["not_a_setting"] = False
        with self.assertRaises(ValidationError):
            self.provision()

    def test_bad_facility_settings_raises_error(self):
        self.provisioning["facility_settings"]["not_a_setting"] = False
        with self.assertRaises(ValidationError):
            self.provision()
