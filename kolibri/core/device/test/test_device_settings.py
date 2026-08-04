from unittest import mock

import pytest
from django.core.exceptions import ValidationError
from django.test import TestCase

import kolibri.core.device.models as device_models
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

    def test_repeated_gets_served_from_in_process_memo(self):
        DeviceSettings.objects.create()
        with mock.patch.object(
            device_models, "cache", wraps=device_models.cache
        ) as cache_spy:
            DeviceSettings.objects.get()
            DeviceSettings.objects.get()
            DeviceSettings.objects.get()
        # First read populates the in-process memo; the rest are served from it
        # without touching the process_cache backend.
        self.assertEqual(cache_spy.get.call_count, 1)

    def test_memo_does_not_share_mutable_fields(self):
        DeviceSettings.objects.create()
        ds = DeviceSettings.objects.get()
        # Mutating a JSON field in place must not reach the memoized instance.
        ds.extra_settings["enable_automatic_download"] = "mutated"
        self.assertNotEqual(
            DeviceSettings.objects.get().extra_settings["enable_automatic_download"],
            "mutated",
        )

    def test_save_invalidates_in_process_memo(self):
        DeviceSettings.objects.create(language_id="en")
        # Populate the memo, then save through an instance fetched off the
        # memoized path, so the assertion can only pass if save() cleared it.
        DeviceSettings.objects.get()
        ds = DeviceSettings.objects.filter(pk=1).first()
        ds.language_id = "es"
        ds.save()
        self.assertEqual(DeviceSettings.objects.get().language_id, "es")

    def test_delete_invalidates_in_process_memo(self):
        DeviceSettings.objects.create()
        # Populate the memo before deleting.
        DeviceSettings.objects.get()
        DeviceSettings.objects.all().delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

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
