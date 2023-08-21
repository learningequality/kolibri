import pytest
from django.core.exceptions import ValidationError
from django.test import TestCase

from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import get_device_hostname
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import LANDING_PAGE_SIGN_IN
from kolibri.core.utils.cache import process_cache as cache


class DeviceSettingsTestCase(TestCase):
    def setUp(self):
        cache.clear()

    def test_singleton(self):
        DeviceSettings.objects.create()
        with self.assertRaises(ValidationError):
            DeviceSettings.objects.create()

    def test_get_setting(self):
        ds = DeviceSettings.objects.create()
        ds2 = DeviceSettings.objects.get()
        self.assertEqual(ds, ds2)

    def test_delete_setting(self):
        ds = DeviceSettings.objects.create()
        ds.delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

    def test_delete_setting_queryset(self):
        DeviceSettings.objects.create()
        DeviceSettings.objects.all().delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

    def test_delete_setting_manager(self):
        DeviceSettings.objects.create()
        DeviceSettings.objects.delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

    @pytest.mark.skip(
        reason="Other tests enabling the App plugin are not properly isolated"
    )
    def test_defaults(self, _):
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

        defaults = {
            # model fields
            "is_provisioned": False,
            "language_id": "en",
            "default_facility": None,
            "landing_page": LANDING_PAGE_SIGN_IN,
            "allow_guest_access": True,
            "allow_peer_unlisted_channel_import": False,
            "allow_learner_unassigned_resource_access": True,
            "name": get_device_hostname(),
            "allow_other_browsers_to_connect": False,
            "subset_of_users_device": False,
            # extra settings
            "allow_download_on_metered_connection": False,
            "enable_automatic_download": True,
            "allow_learner_download_resources": False,
            "set_limit_for_autodownload": False,
            "limit_for_autodownload": 0,
        }

        # TODO: the following fails when this test runs after test_api.py (assertion for clarity
        #       already tested in assertions below)
        ds = DeviceSettings()
        self.assertFalse(ds.allow_other_browsers_to_connect)

        for setting_key, setting_default in defaults.items():
            self.assertEqual(
                get_device_setting(setting_key),
                setting_default,
                "Default value for setting '{}' is not '{}'".format(
                    setting_key, setting_default
                ),
            )
