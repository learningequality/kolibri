import factory
from django.urls import reverse
from rest_framework import status

from .. import models
from .helpers import DUMMY_PASSWORD
from .helpers import enable_qr_login
from .helpers import KolibriAPITestCase as APITestCase
from .helpers import provision_device


class FacilityFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Facility

    name = factory.Sequence(lambda n: "ID Card Facility #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: "idcarduser%d" % n)
    password = factory.PostGenerationMethodCall("set_password", DUMMY_PASSWORD)


SAMPLE_DATA_URL = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgK"
    "DQ0ODw4QDw4RExMTERISFxkZFxkbJB0YGRohIR4cHCgpKyQoKSktLTkwNzg8PTBDR0RFRkxN"
)


class ProfileImageTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.learner = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_profile_image_writable_via_patch(self):
        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.patch(
            url,
            {"profile_image": SAMPLE_DATA_URL},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.profile_image, SAMPLE_DATA_URL)

    def test_profile_image_not_in_list_response(self):
        self.learner.profile_image = SAMPLE_DATA_URL
        self.learner.save()

        url = reverse("kolibri:core:facilityuser-list")
        response = self.client.get(url, format="json")
        found = [u for u in response.data if u["id"] == self.learner.id]
        self.assertEqual(len(found), 1)
        # profile_image is deliberately excluded from the bulk list response
        # to avoid transferring large base64 payloads for every user on every
        # roster load; it is only returned for single-object (detail) requests.
        self.assertNotIn("profile_image", found[0])

    def test_profile_image_returned_in_detail_response(self):
        self.learner.profile_image = SAMPLE_DATA_URL
        self.learner.save()

        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.get(url, format="json")
        self.assertEqual(response.data["profile_image"], SAMPLE_DATA_URL)

    def test_profile_image_defaults_to_none(self):
        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.get(url, format="json")
        self.assertIsNone(response.data["profile_image"])

    def test_profile_image_can_be_cleared(self):
        self.learner.profile_image = SAMPLE_DATA_URL
        self.learner.save()

        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.patch(
            url,
            {"profile_image": None},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        self.assertIsNone(self.learner.profile_image)

    def test_profile_image_rejects_non_data_url(self):
        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.patch(
            url, {"profile_image": "not-an-image"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_image_rejects_non_image_scheme(self):
        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.patch(
            url,
            {"profile_image": "data:text/html;base64,SGVsbG8="},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_image_rejects_oversized_payload(self):
        # A data URL whose decoded size exceeds the cap is rejected so a hostile
        # client cannot store a huge blob that then replicates to every device
        # via Morango. "A" is valid base64; 220000 chars decode to ~165 KB.
        oversized = "data:image/jpeg;base64," + "A" * 220000
        url = reverse(
            "kolibri:core:facilityuser-detail", kwargs={"pk": self.learner.id}
        )
        response = self.client.patch(url, {"profile_image": oversized}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.learner.refresh_from_db()
        self.assertIsNone(self.learner.profile_image)


class RotateQRTokenTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.learner = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        enable_qr_login(self.facility)
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        from kolibri.core.auth.utils.qr_tokens import assign_qr_login_token

        assign_qr_login_token(self.learner)
        self.learner.refresh_from_db()
        self.original_token = self.learner.qr_login_token

    def _rotate_url(self, user_id):
        return reverse(
            "kolibri:core:facilityuser-rotate-qr-token",
            kwargs={"pk": user_id},
        )

    def test_admin_can_rotate_qr_token(self):
        response = self.client.post(self._rotate_url(self.learner.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        self.assertIsNotNone(self.learner.qr_login_token)
        self.assertNotEqual(self.learner.qr_login_token, self.original_token)
        self.assertEqual(response.data["qr_login_token"], self.learner.qr_login_token)

    def test_old_token_invalid_after_rotation(self):
        self.client.post(self._rotate_url(self.learner.id), format="json")
        self.learner.refresh_from_db()
        new_token = self.learner.qr_login_token

        session_url = reverse("kolibri:core:session-list")
        old_response = self.client.post(
            session_url,
            {
                "qr_login_token": self.original_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(old_response.status_code, status.HTTP_400_BAD_REQUEST)

        client2 = self.client_class()
        new_response = client2.post(
            session_url,
            {
                "qr_login_token": new_token,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(new_response.status_code, status.HTTP_200_OK)

    def test_learner_cannot_rotate_own_token(self):
        learner_client = self.client_class()
        learner_client.login(
            username=self.learner.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = learner_client.post(self._rotate_url(self.learner.id), format="json")
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )

    def test_rotate_assigns_new_eligible_token(self):
        response = self.client.post(self._rotate_url(self.learner.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        self.assertGreaterEqual(len(self.learner.qr_login_token), 16)
        self.assertLessEqual(len(self.learner.qr_login_token), 64)

    def test_rotate_on_coach_clears_token(self):
        coach = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_coach(coach)
        coach.qr_login_token = "c" * 43
        coach.save(update_fields=["qr_login_token"])

        response = self.client.post(self._rotate_url(coach.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        coach.refresh_from_db()
        self.assertIsNone(coach.qr_login_token)

    def test_rotate_produces_token_unique_within_facility(self):
        # Give several other learners distinct, pre-existing tokens so we can
        # prove the rotated token collides with none of them.
        other_tokens = []
        for i in range(5):
            other = FacilityUserFactory.create(facility=self.facility)
            token = ("other%d" % i) + ("x" * 40)
            other.qr_login_token = token
            other.save(update_fields=["qr_login_token"])
            other_tokens.append(token)
        existing_tokens = set(other_tokens) | {self.original_token}

        response = self.client.post(self._rotate_url(self.learner.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        new_token = self.learner.qr_login_token

        # The regenerated token differs from the original...
        self.assertNotEqual(new_token, self.original_token)
        # ...is distinct from every other learner's token in the facility...
        self.assertNotIn(new_token, existing_tokens)
        # ...and is globally unique (no other user holds it).
        self.assertFalse(
            models.FacilityUser.objects.filter(qr_login_token=new_token)
            .exclude(id=self.learner.id)
            .exists()
        )

    def test_repeated_rotation_produces_distinct_tokens(self):
        seen = {self.learner.qr_login_token}
        for _ in range(10):
            response = self.client.post(
                self._rotate_url(self.learner.id), format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.learner.refresh_from_db()
            # Every regeneration yields a token that has never been issued
            # before for this learner.
            self.assertNotIn(self.learner.qr_login_token, seen)
            seen.add(self.learner.qr_login_token)
        self.assertEqual(len(seen), 11)


class AssignQRTokenTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.learner = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        enable_qr_login(self.facility)
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _assign_url(self, user_id):
        return reverse(
            "kolibri:core:facilityuser-assign-qr-token",
            kwargs={"pk": user_id},
        )

    def test_admin_can_assign_qr_token_to_missing(self):
        self.learner.qr_login_token = None
        self.learner.save(update_fields=["qr_login_token"])

        response = self.client.post(self._assign_url(self.learner.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        self.assertIsNotNone(self.learner.qr_login_token)
        self.assertEqual(response.data["qr_login_token"], self.learner.qr_login_token)

    def test_assign_is_idempotent(self):
        from kolibri.core.auth.utils.qr_tokens import assign_qr_login_token

        assign_qr_login_token(self.learner)
        self.learner.refresh_from_db()
        existing_token = self.learner.qr_login_token
        self.assertIsNotNone(existing_token)

        response = self.client.post(self._assign_url(self.learner.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.learner.refresh_from_db()
        # Token is unchanged — assign never rotates an existing token.
        self.assertEqual(self.learner.qr_login_token, existing_token)
        self.assertEqual(response.data["qr_login_token"], existing_token)

    def test_learner_cannot_assign_own_token(self):
        self.learner.qr_login_token = None
        self.learner.save(update_fields=["qr_login_token"])

        learner_client = self.client_class()
        learner_client.login(
            username=self.learner.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = learner_client.post(self._assign_url(self.learner.id), format="json")
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )
        self.learner.refresh_from_db()
        self.assertIsNone(self.learner.qr_login_token)

    def test_assign_on_coach_does_not_assign(self):
        coach = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_coach(coach)
        self.assertIsNone(coach.qr_login_token)

        response = self.client.post(self._assign_url(coach.id), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        coach.refresh_from_db()
        # Coaches are ineligible; no token is ever assigned.
        self.assertIsNone(coach.qr_login_token)


class ProfileImageOnCreateTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

    def setUp(self):
        enable_qr_login(self.facility)
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_create_user_with_profile_image(self):
        url = reverse("kolibri:core:facilityuser-list")
        response = self.client.post(
            url,
            {
                "username": "photouser",
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
                "profile_image": SAMPLE_DATA_URL,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertEqual(user.profile_image, SAMPLE_DATA_URL)


class AssignQRLoginTokensToFacilityTaskTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        enable_qr_login(cls.facility)

    def test_assigns_tokens_to_all_eligible_learners(self):
        learner1 = FacilityUserFactory.create(facility=self.facility)
        learner2 = FacilityUserFactory.create(facility=self.facility)
        learner3 = FacilityUserFactory.create(facility=self.facility)

        from kolibri.core.auth.utils.qr_tokens import assign_qr_login_token

        assign_qr_login_token(learner1)
        learner1.refresh_from_db()

        from kolibri.core.auth.tasks import assign_qr_login_tokens_to_facility

        assign_qr_login_tokens_to_facility(self.facility.id)

        learner1.refresh_from_db()
        learner2.refresh_from_db()
        learner3.refresh_from_db()
        self.assertIsNotNone(learner1.qr_login_token)
        self.assertIsNotNone(learner2.qr_login_token)
        self.assertIsNotNone(learner3.qr_login_token)
        self.assertGreaterEqual(len(learner2.qr_login_token), 16)

    def test_skips_coaches_and_superusers(self):
        from .helpers import create_superuser

        coach = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_coach(coach)
        superuser = create_superuser(self.facility)

        from kolibri.core.auth.tasks import assign_qr_login_tokens_to_facility

        assign_qr_login_tokens_to_facility(self.facility.id)

        coach.refresh_from_db()
        superuser.refresh_from_db()
        self.assertIsNone(coach.qr_login_token)
        self.assertIsNone(superuser.qr_login_token)

    def test_skips_learners_that_already_have_tokens(self):
        from kolibri.core.auth.utils.qr_tokens import assign_qr_login_token

        learner = FacilityUserFactory.create(facility=self.facility)
        assign_qr_login_token(learner)
        learner.refresh_from_db()
        original_token = learner.qr_login_token

        from kolibri.core.auth.tasks import assign_qr_login_tokens_to_facility

        assign_qr_login_tokens_to_facility(self.facility.id)

        learner.refresh_from_db()
        self.assertEqual(learner.qr_login_token, original_token)
