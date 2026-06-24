from django.test import TestCase

from ..models import Facility
from ..models import FacilityUser
from ..utils.qr_tokens import assign_qr_login_token
from ..utils.qr_tokens import clear_qr_login_token
from ..utils.qr_tokens import generate_qr_login_token
from ..utils.qr_tokens import reassign_qr_login_token
from .helpers import create_superuser


class GenerateQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="QR Token Facility")

    def test_generate_returns_url_safe_string_of_expected_length(self):
        token = generate_qr_login_token()
        self.assertIsInstance(token, str)
        self.assertGreaterEqual(len(token), 16)
        self.assertLessEqual(len(token), 64)

    def test_generate_returns_distinct_tokens(self):
        tokens = {generate_qr_login_token() for _ in range(200)}
        self.assertEqual(len(tokens), 200)


class AssignQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Assign QR Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.facility.add_coach(cls.coach)
        cls.superuser = create_superuser(cls.facility)

    def test_assigns_token_to_eligible_learner(self):
        result = assign_qr_login_token(self.learner)
        self.assertTrue(result)
        self.learner.refresh_from_db()
        self.assertIsNotNone(self.learner.qr_login_token)
        self.assertGreaterEqual(len(self.learner.qr_login_token), 16)
        self.assertLessEqual(len(self.learner.qr_login_token), 64)

    def test_returns_true_when_token_already_set(self):
        assign_qr_login_token(self.learner)
        first_token = self.learner.qr_login_token

        result = assign_qr_login_token(self.learner)

        self.assertTrue(result)
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.qr_login_token, first_token)

    def test_noop_for_coach(self):
        result = assign_qr_login_token(self.coach)
        self.assertFalse(result)
        self.coach.refresh_from_db()
        self.assertIsNone(self.coach.qr_login_token)

    def test_noop_for_superuser(self):
        result = assign_qr_login_token(self.superuser)
        self.assertFalse(result)
        self.superuser.refresh_from_db()
        self.assertIsNone(self.superuser.qr_login_token)


class ReassignQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Reassign QR Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )

    def test_replaces_existing_token(self):
        assign_qr_login_token(self.learner)
        original = self.learner.qr_login_token

        result = reassign_qr_login_token(self.learner)

        self.assertTrue(result)
        self.learner.refresh_from_db()
        self.assertIsNotNone(self.learner.qr_login_token)
        self.assertNotEqual(self.learner.qr_login_token, original)

    def test_assigns_token_when_none_present(self):
        result = reassign_qr_login_token(self.learner)
        self.assertTrue(result)
        self.learner.refresh_from_db()
        self.assertIsNotNone(self.learner.qr_login_token)

    def test_clears_token_for_ineligible_user(self):
        coach = FacilityUser.objects.create(
            username="promoted_coach", facility=self.facility
        )
        self.facility.add_coach(coach)
        coach.qr_login_token = generate_qr_login_token()
        coach.save(update_fields=["qr_login_token"])

        result = reassign_qr_login_token(coach)

        self.assertFalse(result)
        coach.refresh_from_db()
        self.assertIsNone(coach.qr_login_token)

    def test_reassign_token_does_not_collide_with_other_users(self):
        # Populate several other users with distinct tokens.
        for i in range(5):
            other = FacilityUser.objects.create(
                username="other%d" % i, facility=self.facility
            )
            other.qr_login_token = generate_qr_login_token()
            other.save(update_fields=["qr_login_token"])
        assign_qr_login_token(self.learner)
        existing_tokens = set(
            FacilityUser.objects.exclude(id=self.learner.id).values_list(
                "qr_login_token", flat=True
            )
        )

        reassign_qr_login_token(self.learner)

        self.learner.refresh_from_db()
        # The freshly-rotated token is globally unique — no other user holds it.
        self.assertIsNotNone(self.learner.qr_login_token)
        self.assertNotIn(self.learner.qr_login_token, existing_tokens)


class ClearQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Clear QR Facility")
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )

    def test_clears_existing_token(self):
        assign_qr_login_token(self.learner)
        self.assertIsNotNone(self.learner.qr_login_token)

        clear_qr_login_token(self.learner)

        self.learner.refresh_from_db()
        self.assertIsNone(self.learner.qr_login_token)

    def test_noop_when_no_token_set(self):
        clear_qr_login_token(self.learner)
        self.learner.refresh_from_db()
        self.assertIsNone(self.learner.qr_login_token)
