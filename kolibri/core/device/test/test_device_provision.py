from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.management import call_command
from django.test import TestCase

from ..management.commands.provisiondevice import create_device_settings
from ..management.commands.provisiondevice import create_facility
from ..management.commands.provisiondevice import create_superuser
from ..models import DeviceSettings
from kolibri.core.auth.constants.facility_presets import mappings
from kolibri.core.auth.constants.facility_presets import presets
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.helpers import setup_device


class DeviceProvisionTestCase(TestCase):
    """
    Tests for functions used in provisiondevice command.
    """

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
        facility = create_facility(facility_name=default_facility.name)
        self.assertEqual(default_facility, facility)

    def test_create_super_user(self):
        Facility.objects.create(name="Test")
        provision_device()
        create_superuser(username="test", password="test")
        self.assertTrue(FacilityUser.objects.get(username="test").is_superuser)

    def test_create_device_settings_provisioned(self):
        facility = Facility.objects.create(name="Test")
        create_device_settings(language_id="en", facility=facility)
        self.assertTrue(DeviceSettings.objects.get().is_provisioned)

    def test_create_device_settings_language(self):
        facility = Facility.objects.create(name="Test")
        create_device_settings(language_id="en", facility=facility)
        self.assertEqual(DeviceSettings.objects.get().language_id, "en")

    def test_create_device_settings_default_facility(self):
        facility = Facility.objects.create(name="Test")
        create_device_settings(language_id="en", facility=facility)
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
