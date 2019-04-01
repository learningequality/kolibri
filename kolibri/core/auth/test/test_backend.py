from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from ..backends import FacilityUserBackend
from ..models import Facility
from ..models import FacilityUser


class FacilityUserBackendTestCase(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        user = self.user = FacilityUser(username="Mike", facility=self.facility)
        user.set_password("foo")
        user.save()

    def test_facility_user_authenticated(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                username="Mike", password="foo", facility=self.facility
            ),
        )

    def test_facility_user_authentication_does_not_require_facility(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(username="Mike", password="foo"),
        )

    def test_device_owner_not_authenticated(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(username="Chuck", password="foobar")
        )

    def test_incorrect_password_does_not_authenticate(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                username="Mike", password="blahblah", facility=self.facility
            )
        )

    def test_get_facility_user(self):
        self.assertEqual(self.user, FacilityUserBackend().get_user(self.user.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(
            FacilityUserBackend().get_user("8acf96e56d0d4ab49fab3fbf3f716bc2")
        )

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(FacilityUserBackend().authenticate("foo", "bar"))

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(FacilityUserBackend().authenticate("Mike", "goo"))
