import mock
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.urls import reverse

import factory
from rest_framework import status

from ..backends import QRTokenAuthScope
from ..models import Facility
from ..models import FacilityUser
from .helpers import create_superuser
from .helpers import DUMMY_PASSWORD
from .helpers import disable_qr_login
from .helpers import enable_qr_login
from .helpers import KolibriAPITestCase as APITestCase
from .helpers import provision_device
from kolibri.core import error_constants


class FacilityFactory(factory.DjangoModelFactory):
    class Meta:
        model = Facility

    name = factory.Sequence(lambda n: "QR Auth Facility #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):
    class Meta:
        model = FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: "qruser%d" % n)
    password = factory.PostGenerationMethodCall("set_password", DUMMY_PASSWORD)


def _set_has_roles(user):
    setattr(user, "has_roles", user.roles.count() > 0)
    return user


class QRTokenAuthScopeTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="QR Scope Facility")
        cls.dataset = cls.facility.dataset
        cls.dataset.enable_qr_login = True
        cls.dataset.save()

        cls.other_facility = Facility.objects.create(name="QR Other Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.qr_login_token = "a" * 43
        cls.learner.save(update_fields=["qr_login_token"])
        _set_has_roles(cls.learner)

    def setUp(self):
        dataset_id_patcher = mock.patch(
            "kolibri.core.auth.backends.is_full_facility_import"
        )
        self.is_full_facility_import = dataset_id_patcher.start()
        self.is_full_facility_import.return_value = True
        self.addCleanup(dataset_id_patcher.stop)

    def test_matches_credentials_returns_true_for_eligible_learner(self):
        auth_scope = QRTokenAuthScope(self.facility, self.learner.qr_login_token)
        self.assertTrue(auth_scope.matches_credentials(self.learner))

    def test_iter_candidate_users_raises_permission_denied_without_facility(self):
        auth_scope = QRTokenAuthScope(None, self.learner.qr_login_token)
        with self.assertRaises(PermissionDenied):
            list(auth_scope.iter_candidate_users())

    def test_iter_candidate_users_filters_by_token(self):
        other = FacilityUser.objects.create(
            username="other", facility=self.facility
        )
        other.qr_login_token = "b" * 43
        other.save(update_fields=["qr_login_token"])

        auth_scope = QRTokenAuthScope(self.facility, self.learner.qr_login_token)
        self.assertEqual(list(auth_scope.iter_candidate_users()), [self.learner])

    def test_matches_credentials_returns_false_when_qr_login_disabled(self):
        self.dataset.enable_qr_login = False
        self.dataset.save()

        auth_scope = QRTokenAuthScope(self.facility, self.learner.qr_login_token)
        self.assertFalse(auth_scope.matches_credentials(self.learner))

    def test_matches_credentials_returns_false_for_coach(self):
        coach = FacilityUser.objects.create(
            username="coach", facility=self.facility
        )
        coach.qr_login_token = "c" * 43
        coach.save(update_fields=["qr_login_token"])
        self.facility.add_coach(coach)

        auth_scope = QRTokenAuthScope(self.facility, coach.qr_login_token)
        self.assertFalse(auth_scope.matches_credentials(_set_has_roles(coach)))

    def test_matches_credentials_returns_false_for_superuser_when_full_import(self):
        superuser = create_superuser(self.facility, username="superuser")
        superuser.qr_login_token = "d" * 43
        superuser.save(update_fields=["qr_login_token"])

        auth_scope = QRTokenAuthScope(self.facility, superuser.qr_login_token)
        self.assertFalse(auth_scope.matches_credentials(_set_has_roles(superuser)))

    def test_matches_credentials_returns_true_for_superuser_when_single_user(self):
        self.is_full_facility_import.return_value = False
        superuser = create_superuser(self.facility, username="single_superuser")
        superuser.qr_login_token = "e" * 43
        superuser.save(update_fields=["qr_login_token"])

        auth_scope = QRTokenAuthScope(self.facility, superuser.qr_login_token)
        self.assertTrue(auth_scope.matches_credentials(_set_has_roles(superuser)))


class QRLoginSessionTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.other_facility = FacilityFactory.create()
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.learner.qr_login_token = "a" * 43
        cls.learner.save(update_fields=["qr_login_token"])

    def setUp(self):
        enable_qr_login(self.facility)
        enable_qr_login(self.other_facility)

    def test_valid_qr_token_creates_session(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "qr_login_token": self.learner.qr_login_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_id"], self.learner.id)

    def test_invalid_qr_token_returns_not_found(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "qr_login_token": "z" * 43,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
        self.assertEqual(response.data[0]["metadata"]["field"], "qr_login_token")

    def test_failed_qr_attempt_does_not_fall_through_to_username_password(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.learner.username,
                "password": DUMMY_PASSWORD,
                "qr_login_token": "z" * 43,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
        self.assertEqual(response.data[0]["metadata"]["field"], "qr_login_token")

    def test_qr_login_disabled_returns_not_found(self):
        disable_qr_login(self.facility)
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "qr_login_token": self.learner.qr_login_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
        self.assertEqual(response.data[0]["metadata"]["field"], "qr_login_token")

    def test_coach_not_authenticated_via_qr_token(self):
        coach = FacilityUserFactory.create(facility=self.facility)
        coach.qr_login_token = "c" * 43
        coach.save(update_fields=["qr_login_token"])
        self.facility.add_coach(coach)
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "qr_login_token": coach.qr_login_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
        self.assertEqual(response.data[0]["metadata"]["field"], "qr_login_token")

    def test_qr_token_wrong_facility_returns_not_found(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "qr_login_token": self.learner.qr_login_token,
                "facility": self.other_facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
        self.assertEqual(response.data[0]["metadata"]["field"], "qr_login_token")


class QRLoginPrevalidateTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.learner.qr_login_token = "a" * 43
        cls.learner.save(update_fields=["qr_login_token"])

    def setUp(self):
        enable_qr_login(self.facility)

    def _url(self):
        return reverse("kolibri:core:session-list") + "?prevalidate=true"

    def test_valid_qr_token_returns_full_name(self):
        response = self.client.post(
            self._url(),
            data={
                "qr_login_token": self.learner.qr_login_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], self.learner.full_name)

    def test_valid_qr_token_does_not_create_session(self):
        self.client.post(
            self._url(),
            data={
                "qr_login_token": self.learner.qr_login_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertFalse(self.client.session.get("_auth_user_id"))

    def test_wrong_qr_token_returns_not_found(self):
        response = self.client.post(
            self._url(),
            data={
                "qr_login_token": "z" * 43,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)
