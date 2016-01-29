from django.test import TestCase

# Importing user models here results in a circular import... you should use get_user_model, but then there's no
# way to get the proxy models as well. So just import at runtime.
from kolibri.auth.backends import DeviceBackend


class DeviceBackendTestCase(TestCase):
    def setUp(self):
        from kolibri.auth.models import FacilityUser, DeviceOwner
        user = self.user = FacilityUser(username="Mike")
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_not_authenticated(self):
        self.assertIsNone(DeviceBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_authenticated(self):
        self.assertEqual(self.do, DeviceBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        self.assertIsNone(DeviceBackend().get_user(self.user.id))

    def test_get_device_owner(self):
        self.assertEqual(self.do, DeviceBackend().get_user(self.do.id))
