import mock
from django.test import TestCase

from ..backends import FacilityUserBackend
from ..models import Facility
from ..models import FacilityUser
from .helpers import create_superuser


class FacilityUserBackendTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.user = FacilityUser(username="Mike", facility=cls.facility)
        cls.user.set_password("foo")
        cls.user.save()
        cls.user_other_mike = FacilityUser.objects.create(
            username="mike", facility=cls.facility
        )
        cls.user_other_mike.set_password("foo")
        cls.user_other_mike.save()
        cls.request = mock.Mock()

    def test_facility_user_authenticated(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request, username="Mike", password="foo", facility=self.facility
            ),
        )

    def test_facility_user_other_mike_authenticated(self):
        self.assertEqual(
            self.user_other_mike,
            FacilityUserBackend().authenticate(
                self.request, username="mike", password="foo", facility=self.facility
            ),
        )

    def test_facility_user_authenticated__facility_id(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request, username="Mike", password="foo", facility=self.facility.pk
            ),
        )

    def test_facility_user_other_mike_authenticated__facility_id(self):
        self.assertEqual(
            self.user_other_mike,
            FacilityUserBackend().authenticate(
                self.request, username="mike", password="foo", facility=self.facility.pk
            ),
        )

    def test_facility_user_authentication_does_not_require_facility(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request, username="Mike", password="foo"
            ),
        )

    def test_facility_user_other_mike_authentication_does_not_require_facility(self):
        self.assertEqual(
            self.user_other_mike,
            FacilityUserBackend().authenticate(
                self.request, username="mike", password="foo"
            ),
        )

    def test_device_owner_not_authenticated(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request, username="Chuck", password="foobar"
            )
        )

    def test_incorrect_password_does_not_authenticate(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="blahblah",
                facility=self.facility,
            )
        )

    def test_get_facility_user(self):
        self.assertEqual(self.user, FacilityUserBackend().get_user(self.user.id))

    def test_nonexistent_user_returns_none(self):
        self.assertIsNone(
            FacilityUserBackend().get_user("8acf96e56d0d4ab49fab3fbf3f716bc2")
        )

    def test_authenticate_nonexistent_user_returns_none(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(self.request, "foo", "bar")
        )

    def test_authenticate_with_wrong_password_returns_none(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(self.request, "Mike", "goo")
        )


class PicturePasswordBackendTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Pic Facility")
        cls.other_facility = Facility.objects.create(name="Other Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner",
            facility=cls.facility,
            picture_password="1.2.3",
        )
        cls.request = mock.Mock()

    def test_valid_picture_password_returns_learner(self):
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="1.2.3",
            facility=self.facility,
        )
        self.assertEqual(user, self.learner)

    def test_picture_password_wrong_facility_returns_none(self):
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="1.2.3",
            facility=self.other_facility,
        )
        self.assertIsNone(user)

    def test_picture_password_no_match_returns_none(self):
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="9.9.9",
            facility=self.facility,
        )
        self.assertIsNone(user)

    def test_picture_password_no_facility_returns_none(self):
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="1.2.3",
        )
        self.assertIsNone(user)

    def test_coach_not_returned_by_picture_password(self):
        coach = FacilityUser.objects.create(
            username="coach",
            facility=self.facility,
            picture_password="4.5.6",
        )
        self.facility.add_coach(coach)
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="4.5.6",
            facility=self.facility,
        )
        self.assertIsNone(user)

    def test_admin_not_returned_by_picture_password(self):
        admin = FacilityUser.objects.create(
            username="admin",
            facility=self.facility,
            picture_password="7.8.9",
        )
        self.facility.add_admin(admin)
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="7.8.9",
            facility=self.facility,
        )
        self.assertIsNone(user)

    def test_device_superuser_not_returned_by_picture_password(self):
        superuser = create_superuser(self.facility, username="superuser")
        superuser.picture_password = "2.4.6"
        superuser.save(update_fields=["picture_password"])
        user = FacilityUserBackend().authenticate(
            self.request,
            picture_password="2.4.6",
            facility=self.facility,
        )
        self.assertIsNone(user)

    def test_picture_password_none_does_not_use_picture_path(self):
        # When picture_password is None, falls through to username/password path
        # (which returns None for non-existent username)
        user = FacilityUserBackend().authenticate(
            self.request,
            username="nobody",
            password="wrong",
            picture_password=None,
            facility=self.facility,
        )
        self.assertIsNone(user)
