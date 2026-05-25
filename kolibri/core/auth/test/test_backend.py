import uuid
from datetime import timedelta

import mock
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.utils import timezone

from ..backends import BasicUserAuthScope
from ..backends import FacilityAuthScope
from ..backends import FacilityUserBackend
from ..backends import PicturePasswordAuthScope
from ..models import Facility
from ..models import FacilityUser
from .helpers import create_superuser
from .helpers import disable_picture_password
from .helpers import DUMMY_PASSWORD
from .helpers import enable_picture_password


class _NoMatchFacilityAuthScope(FacilityAuthScope):
    def iter_candidate_users(self):
        return iter(self.get_queryset())

    def matches_credentials(self, user):
        return False


class FacilityUserBackendTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create()
        cls.other_facility = Facility.objects.create()

        cls.dataset = cls.facility.dataset

        cls.user = FacilityUser(username="Mike", facility=cls.facility)
        cls.user.set_password("foo")
        cls.user.save()

        cls.user_other_mike = FacilityUser(username="mike", facility=cls.facility)
        cls.user_other_mike.set_password("foo")
        cls.user_other_mike.save()

        cls.picture_user = FacilityUser.objects.create(
            username="pic-user",
            facility=cls.facility,
            picture_password="1.2.3",
        )
        cls.picture_user.set_password("foo")
        cls.picture_user.save()

        cls.request = mock.Mock()

    def setUp(self):
        dataset_id_patcher = mock.patch(
            "kolibri.core.auth.backends.is_full_facility_import"
        )
        self.is_full_facility_import = dataset_id_patcher.start()
        self.is_full_facility_import.return_value = True
        self.addCleanup(dataset_id_patcher.stop)

        disable_picture_password(self.facility, passwordless=False)

    def test_authenticate__returns_user_for_valid_facility_object_credentials(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="foo",
                facility=self.facility,
            ),
        )

    def test_authenticate__returns_user_for_valid_facility_pk_credentials(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="foo",
                facility=self.facility.pk,
            ),
        )

    def test_authenticate__returns_none_for_basic_user_without_facility(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="foo",
            )
        )

    def test_authenticate__returns_unambiguous_case_insensitive_match_after_case_sensitive_miss(
        self,
    ):
        self.assertEqual(
            self.picture_user,
            FacilityUserBackend().authenticate(
                self.request,
                username="PIC-USER",
                password="foo",
                facility=self.facility,
            ),
        )

    def test_authenticate__returns_none_for_wrong_password(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="blahblah",
                facility=self.facility,
            )
        )

    def test_authenticate__returns_none_for_missing_user(self):
        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username="not-a-user",
                password="bar",
            )
        )

    def test_authenticate__allows_learner_passwordless_login_with_facility(self):
        disable_picture_password(self.facility, passwordless=True)

        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                facility=self.facility,
            ),
        )

    def test_authenticate__does_not_allow_coach_passwordless_login(self):
        coach = FacilityUser.objects.create(
            username="coach",
            facility=self.facility,
            picture_password="4.5.6",
        )
        coach.set_password(DUMMY_PASSWORD)
        coach.save()
        self.facility.add_coach(coach)
        disable_picture_password(self.facility, passwordless=True)

        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username="coach",
                facility=self.facility,
            )
        )

    def test_authenticate__allows_superuser_with_valid_password(self):
        superuser = create_superuser(self.facility, username="superuser")

        self.assertEqual(
            superuser,
            FacilityUserBackend().authenticate(
                self.request,
                username=superuser.username,
                password=DUMMY_PASSWORD,
            ),
        )

    def test_authenticate__allows_superuser_with_valid_password_regardless_of_facility(
        self,
    ):
        superuser = create_superuser(self.facility, username="superuser")

        self.assertEqual(
            superuser,
            FacilityUserBackend().authenticate(
                self.request,
                username=superuser.username,
                password=DUMMY_PASSWORD,
                facility=self.other_facility.pk,
            ),
        )

    def test_authenticate__does_not_allow_superuser_passwordless_when_full_import(self):
        superuser = create_superuser(self.facility, username="superuser")
        disable_picture_password(self.facility, passwordless=True)

        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                username=superuser.username,
                facility=self.facility,
            )
        )

    def test_authenticate__allows_superuser_passwordless_when_single_user_on_device(
        self,
    ):
        superuser = create_superuser(self.facility, username="superuser")
        self.is_full_facility_import.return_value = False
        disable_picture_password(self.facility, passwordless=True)

        self.assertEqual(
            superuser,
            FacilityUserBackend().authenticate(
                self.request,
                username=superuser.username,
                facility=self.facility,
            ),
        )

    def test_authenticate__uses_username_path_when_picture_password_is_none(self):
        self.assertEqual(
            self.user,
            FacilityUserBackend().authenticate(
                self.request,
                username="Mike",
                password="foo",
                picture_password=None,
                facility=self.facility,
            ),
        )

    def test_authenticate__returns_user_for_valid_picture_password_with_facility(self):
        enable_picture_password(self.facility)

        self.assertEqual(
            self.picture_user,
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="1.2.3",
                facility=self.facility,
            ),
        )

    def test_authenticate__returns_user_for_valid_picture_password_with_facility_pk(
        self,
    ):
        enable_picture_password(self.facility)

        self.assertEqual(
            self.picture_user,
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="1.2.3",
                facility=self.facility.pk,
            ),
        )

    def test_authenticate__returns_user_for_valid_username(
        self,
    ):
        """
        With picture passwords enabled, passwordless sign-in is always enabled
        """
        enable_picture_password(self.facility)

        self.assertEqual(
            self.picture_user,
            FacilityUserBackend().authenticate(
                self.request,
                username="pic-user",
                picture_password=None,
                facility=self.facility.pk,
            ),
        )

    def test_authenticate__returns_user_for_valid_username_password_meaningless(
        self,
    ):
        """
        With picture passwords enabled, passwordless sign-in is always enabled, but auth does not
        reject the attempt if a password is provided
        """
        enable_picture_password(self.facility)

        self.assertEqual(
            self.picture_user,
            FacilityUserBackend().authenticate(
                self.request,
                username="pic-user",
                password="wrongpassword",
                picture_password=None,
                facility=self.facility.pk,
            ),
        )

    def test_authenticate__raises_permission_denied_for_picture_password_without_facility(
        self,
    ):
        enable_picture_password(self.facility)

        with self.assertRaises(PermissionDenied):
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="1.2.3",
            )

    def test_authenticate__returns_none_for_picture_password_with_wrong_facility(self):
        disable_picture_password(self.other_facility)

        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="1.2.3",
                facility=self.other_facility,
            )
        )

    def test_authenticate__returns_none_for_non_matching_picture_password(self):
        enable_picture_password(self.facility)

        self.assertIsNone(
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="9.9.9",
                facility=self.facility,
            )
        )

    def test_authenticate__allows_superuser_picture_password_when_single_user_on_device(
        self,
    ):
        superuser = create_superuser(self.facility, username="superuser")
        superuser.picture_password = "2.4.6"
        superuser.save(update_fields=["picture_password"])
        self.is_full_facility_import.return_value = False
        enable_picture_password(self.facility)

        self.assertEqual(
            superuser,
            FacilityUserBackend().authenticate(
                self.request,
                picture_password="2.4.6",
                facility=self.facility,
            ),
        )

    def test_get_user__returns_user_for_existing_id(self):
        self.assertEqual(self.user, FacilityUserBackend().get_user(self.user.id))

    def test_get_user__returns_none_for_nonexistent_id(self):
        self.assertIsNone(
            FacilityUserBackend().get_user("8acf96e56d0d4ab49fab3fbf3f716bc2")
        )


class FacilityAuthScopeTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Scoped Facility")
        cls.other_facility = Facility.objects.create(name="Other Facility")

    def setUp(self):
        dataset_id_patcher = mock.patch(
            "kolibri.core.auth.backends.is_full_facility_import"
        )
        self.is_full_facility_import = dataset_id_patcher.start()
        self.is_full_facility_import.return_value = True
        self.addCleanup(dataset_id_patcher.stop)

    def test_dataset_id__returns_dataset_id_for_facility_object(self):
        auth_scope = _NoMatchFacilityAuthScope(self.facility)
        self.assertEqual(self.facility.dataset_id, auth_scope.dataset_id)

    def test_dataset_id__returns_dataset_id_for_facility_pk(self):
        auth_scope = _NoMatchFacilityAuthScope(self.facility.pk)
        self.assertEqual(self.facility.dataset_id, auth_scope.dataset_id)

    def test_dataset_id__raises_permission_denied_for_missing_facility_pk(self):
        auth_scope = _NoMatchFacilityAuthScope(str(uuid.uuid4()))
        with self.assertRaises(PermissionDenied):
            auth_scope.dataset_id

    def test_is_subset_of_users_device__returns_false_for_full_facility_import(self):
        auth_scope = _NoMatchFacilityAuthScope(self.facility)
        self.assertFalse(auth_scope.is_full_facility_import)

    def test_is_subset_of_users_device__returns_true_for_partial_facility_import(self):
        self.is_full_facility_import.return_value = False
        auth_scope = _NoMatchFacilityAuthScope(self.facility)
        self.assertTrue(auth_scope.is_full_facility_import)

    def test_iter_candidate_users__filters_users_by_dataset_scope(self):
        scoped_user = FacilityUser.objects.create(
            username="scoped-user",
            facility=self.facility,
            picture_password="1.1.1",
        )
        FacilityUser.objects.create(
            username="other-user",
            facility=self.other_facility,
            picture_password="2.2.2",
        )

        auth_scope = _NoMatchFacilityAuthScope(self.facility)
        self.assertEqual(list(auth_scope.iter_candidate_users()), [scoped_user])

    def test_iter_candidate_users__orders_users_by_has_roles_then_date_joined(self):
        base_time = timezone.now()
        learner_old = FacilityUser.objects.create(
            username="learner-old",
            facility=self.facility,
        )
        coach_new = FacilityUser.objects.create(
            username="coach-new",
            facility=self.facility,
        )
        coach_old = FacilityUser.objects.create(
            username="coach-old",
            facility=self.facility,
        )
        learner_new = FacilityUser.objects.create(
            username="learner-new",
            facility=self.facility,
        )
        self.facility.add_coach(coach_new)
        self.facility.add_coach(coach_old)

        FacilityUser.objects.filter(pk=learner_old.pk).update(
            date_joined=base_time + timedelta(seconds=1)
        )
        FacilityUser.objects.filter(pk=coach_new.pk).update(
            date_joined=base_time + timedelta(seconds=4)
        )
        FacilityUser.objects.filter(pk=coach_old.pk).update(
            date_joined=base_time + timedelta(seconds=2)
        )
        FacilityUser.objects.filter(pk=learner_new.pk).update(
            date_joined=base_time + timedelta(seconds=3)
        )

        auth_scope = _NoMatchFacilityAuthScope(self.facility)
        self.assertEqual(
            list(auth_scope.iter_candidate_users()),
            [coach_old, coach_new, learner_old, learner_new],
        )


class PicturePasswordAuthScopeTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Picture Facility")
        cls.dataset = cls.facility.dataset
        cls.dataset.learner_can_login_with_no_password = True
        cls.dataset.learner_can_edit_password = False
        cls.dataset.picture_password_settings = {
            "icon_style": "standard",
            "show_icon_text": True,
        }
        cls.dataset.save()

        cls.other_facility = Facility.objects.create(name="Other Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner",
            facility=cls.facility,
            picture_password="1.2.3",
        )
        cls._set_has_roles(cls.learner)

    def setUp(self):
        dataset_id_patcher = mock.patch(
            "kolibri.core.auth.backends.is_full_facility_import"
        )
        self.is_full_facility_import = dataset_id_patcher.start()
        self.is_full_facility_import.return_value = True
        self.addCleanup(dataset_id_patcher.stop)

    @classmethod
    def _set_has_roles(cls, user):
        """This is annotated by the auth scope querysets"""
        setattr(user, "has_roles", user.roles.count() > 0)
        return user

    def test_authenticate__returns_learner_for_valid_picture_password(self):
        auth_scope = PicturePasswordAuthScope(self.facility, "1.2.3")
        self.assertTrue(auth_scope.matches_credentials(self.learner))

    def test_iter_candidate_users__raises_permission_denied_without_dataset_scope(self):
        auth_scope = PicturePasswordAuthScope(None, "1.2.3")
        with self.assertRaises(PermissionDenied):
            list(auth_scope.iter_candidate_users())

    def test_matches_credentials__returns_false_when_picture_password_settings_not_configured(
        self,
    ):
        self.dataset.picture_password_settings = None
        self.dataset.save()

        auth_scope = PicturePasswordAuthScope(self.facility, "1.2.3")
        self.assertFalse(auth_scope.matches_credentials(self.learner))

    def test_matches_credentials__returns_false_for_coach(self):
        coach = FacilityUser.objects.create(
            username="coach",
            facility=self.facility,
            picture_password="4.5.6",
        )
        self.facility.add_coach(coach)

        auth_scope = PicturePasswordAuthScope(self.facility, "4.5.6")
        self.assertFalse(auth_scope.matches_credentials(self._set_has_roles(coach)))

    def test_matches_credentials__returns_false_for_device_superuser_when_full_import(
        self,
    ):
        superuser = create_superuser(self.facility, username="superuser")
        superuser.picture_password = "2.4.6"
        superuser.save(update_fields=["picture_password"])

        auth_scope = PicturePasswordAuthScope(self.facility, "2.4.6")
        self.assertFalse(auth_scope.matches_credentials(self._set_has_roles(superuser)))

    def test_matches_credentials__returns_true_for_device_superuser_when_single_user_on_device(
        self,
    ):
        self.is_full_facility_import.return_value = False
        superuser = create_superuser(self.facility, username="superuser")
        superuser.picture_password = "2.4.6"
        superuser.save(update_fields=["picture_password"])

        auth_scope = PicturePasswordAuthScope(self.facility, "2.4.6")
        self.assertTrue(auth_scope.matches_credentials(self._set_has_roles(superuser)))


class BasicUserAuthScopeTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Username Facility")
        cls.user = FacilityUser(username="Mike", facility=cls.facility)
        cls.user.set_password("foo")
        cls.user.save()

    @classmethod
    def _set_has_roles(cls, user):
        """This is annotated by the auth scope querysets"""
        setattr(user, "has_roles", user.roles.count() > 0)
        return user

    def test_iter_candidate_users__returns_case_insensitive_match(
        self,
    ):
        auth_scope = BasicUserAuthScope(self.facility, username="mike", password="foo")
        self.assertEqual(list(auth_scope.iter_candidate_users()), [self.user])

    def test_matches_credentials__returns_true_for_matching_password(self):
        auth_scope = BasicUserAuthScope(self.facility, username="Mike", password="foo")
        self.assertTrue(auth_scope.matches_credentials(self.user))

    def test_matches_credentials__returns_true_for_passwordless_learner_with_role_count_zero(
        self,
    ):
        disable_picture_password(self.facility, passwordless=True)
        auth_scope = BasicUserAuthScope(
            self.facility, username="Mike", password="wrong"
        )
        self.assertTrue(auth_scope.matches_credentials(self._set_has_roles(self.user)))

    def test_matches_credentials__returns_false_for_passwordless_coach_with_nonzero_role_count(
        self,
    ):
        disable_picture_password(self.facility, passwordless=True)
        coach = FacilityUser.objects.create(username="coach", facility=self.facility)
        self.facility.add_coach(coach)
        auth_scope = BasicUserAuthScope(
            self.facility, username="coach", password="wrong"
        )
        self.assertFalse(auth_scope.matches_credentials(self._set_has_roles(coach)))
