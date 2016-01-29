from django.test import TestCase

# Importing user models and backend models here results in a circular import... you should use get_user_model, but
# then there's no way to get the proxy models as well. So just import at runtime.

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
        from kolibri.auth.backends import DeviceBackend
        self.assertIsNone(DeviceBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_authenticated(self):
        from kolibri.auth.backends import DeviceBackend
        self.assertEqual(self.do, DeviceBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        from kolibri.auth.backends import DeviceBackend
        self.assertIsNone(DeviceBackend().get_user(self.user.id))

    def test_get_device_owner(self):
        from kolibri.auth.backends import DeviceBackend
        self.assertEqual(self.do, DeviceBackend().get_user(self.do.id))


class FacilityBackendTestCase(TestCase):
    def setUp(self):
        from kolibri.auth.models import FacilityUser, DeviceOwner
        user = self.user = FacilityUser(username="Mike")
        user.set_password("foo")
        user.save()

        do = self.do = DeviceOwner(username="Chuck")
        do.set_password("foobar")
        do.save()

    def test_facility_user_authenticated(self):
        from kolibri.auth.backends import FacilityBackend
        self.assertEqual(self.user, FacilityBackend().authenticate(username="Mike", password="foo"))

    def test_device_owner_not_authenticated(self):
        from kolibri.auth.backends import FacilityBackend
        self.assertIsNone(FacilityBackend().authenticate(username="Chuck", password="foobar"))

    def test_get_facility_user(self):
        from kolibri.auth.backends import FacilityBackend
        self.assertEqual(self.user, FacilityBackend().get_user(self.user.id))

    def test_get_device_owner(self):
        from kolibri.auth.backends import FacilityBackend
        self.assertIsNone(FacilityBackend().get_user(self.do.id))
