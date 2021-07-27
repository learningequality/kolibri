from django.core.exceptions import ValidationError
from django.test import TestCase

from kolibri.core.device.models import DeviceSettings
from kolibri.core.utils.cache import process_cache as cache


class DeviceSettingsTestCase(TestCase):
    def test_singleton(self):
        cache.clear()
        DeviceSettings.objects.create()
        with self.assertRaises(ValidationError):
            DeviceSettings.objects.create()

    def test_get_setting(self):
        cache.clear()
        ds = DeviceSettings.objects.create()
        ds2 = DeviceSettings.objects.get()
        self.assertEqual(ds, ds2)

    def test_delete_setting(self):
        cache.clear()
        ds = DeviceSettings.objects.create()
        ds.delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

    def test_delete_setting_queryset(self):
        cache.clear()
        DeviceSettings.objects.create()
        DeviceSettings.objects.all().delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()

    def test_delete_setting_manager(self):
        cache.clear()
        DeviceSettings.objects.create()
        DeviceSettings.objects.delete()
        with self.assertRaises(DeviceSettings.DoesNotExist):
            DeviceSettings.objects.get()
