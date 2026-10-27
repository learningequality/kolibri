from datetime import timedelta
from unittest import mock
from unittest.mock import patch

from django.db.models.signals import post_save
from django.db.utils import IntegrityError
from django.test import TestCase
from django.utils.timezone import now
from morango.sync.utils import mute_signals

from kolibri.core.auth.constants.picture_passwords import PICTURE_PASSWORD_SET
from kolibri.core.auth.constants.picture_passwords import SEQUENCE_LENGTH
from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.errors import SequenceAlreadyAssigned
from kolibri.core.auth.utils.picture_passwords import are_picture_passwords_exhausted
from kolibri.core.auth.utils.picture_passwords import assign_picture_password
from kolibri.core.auth.utils.picture_passwords import get_all_valid_sequences
from kolibri.core.auth.utils.picture_passwords import get_assigned_sequences
from kolibri.core.auth.utils.picture_passwords import get_available_sequence
from kolibri.core.auth.utils.picture_passwords import get_learner_count

from ..models import Facility
from ..models import FacilityUser
from .helpers import create_superuser
from .helpers import DUMMY_PASSWORD


class GetAllValidSequencesTestCase(TestCase):
    def test_returns_1320_sequences_for_12_picture_set(self):
        sequences = get_all_valid_sequences(PICTURE_PASSWORD_SET)
        self.assertEqual(len(sequences), 1320)

    def test_all_sequences_are_unique(self):
        sequences = get_all_valid_sequences(PICTURE_PASSWORD_SET)
        self.assertEqual(len(sequences), len(set(sequences)))

    def test_sequences_contain_no_repeated_picture_ids(self):
        for seq_str in get_all_valid_sequences(PICTURE_PASSWORD_SET):
            ids = seq_str.split(".")
            duplicates = [x for x in ids if ids.count(x) > 1]
            self.assertEqual(
                len(ids),
                len(set(ids)),
                f"Sequence '{seq_str}' contains duplicate picture IDs: {set(duplicates)}",
            )

    def test_sequences_have_correct_length(self):
        for seq_str in get_all_valid_sequences(PICTURE_PASSWORD_SET):
            ids = seq_str.split(".")
            self.assertEqual(len(ids), SEQUENCE_LENGTH)

    def test_sequences_only_contain_ids_from_picture_set(self):
        valid_ids = {str(k) for k in PICTURE_PASSWORD_SET}
        for seq_str in get_all_valid_sequences(PICTURE_PASSWORD_SET):
            for pic_id in seq_str.split("."):
                self.assertIn(pic_id, valid_ids)

    def test_order_matters(self):
        sequences = get_all_valid_sequences(PICTURE_PASSWORD_SET)
        ids = list(PICTURE_PASSWORD_SET.keys())[:3]
        forward = ".".join(str(i) for i in ids)
        reverse = ".".join(str(i) for i in reversed(ids))
        self.assertIn(forward, sequences)
        self.assertIn(reverse, sequences)
        self.assertNotEqual(forward, reverse)


class GetAssignedSequencesTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Picture LoginTest Facility")

    def test_returns_learner_sequences(self):
        learner = FacilityUser.objects.create(
            username="learner",
            facility=self.facility,
            picture_password="1.2.3",
        )
        assigned = get_assigned_sequences(self.facility)
        self.assertIn(learner.picture_password, assigned)

    def test_excludes_admins(self):
        admin = FacilityUser.objects.create(
            username="admin",
            facility=self.facility,
            picture_password="4.5.6",
        )
        self.facility.add_admin(admin)
        assigned = get_assigned_sequences(self.facility)
        self.assertNotIn("4.5.6", assigned)

    def test_excludes_coaches(self):
        coach = FacilityUser.objects.create(
            username="coach",
            facility=self.facility,
            picture_password="7.8.9",
        )
        self.facility.add_coach(coach)
        assigned = get_assigned_sequences(self.facility)
        self.assertNotIn("7.8.9", assigned)

    def test_excludes_null_picture_passwords(self):
        FacilityUser.objects.create(
            username="no_picture",
            facility=self.facility,
            picture_password=None,
        )
        assigned = get_assigned_sequences(self.facility)
        self.assertNotIn(None, assigned)

    def test_excludes_learners_from_other_facility(self):
        other_facility = Facility.objects.create(name="Other")
        FacilityUser.objects.create(
            username="other_learner",
            facility=other_facility,
            picture_password="10.11.12",
        )
        assigned = get_assigned_sequences(self.facility)
        self.assertNotIn("10.11.12", assigned)

    def test_includes_soft_deleted_learners(self):
        learner = FacilityUser.objects.create(
            username="soft_deleted",
            facility=self.facility,
            picture_password="1.2.3",
        )
        learner.date_deleted = now()
        learner.save()

        assigned = get_assigned_sequences(self.facility)
        self.assertIn("1.2.3", assigned)


class AssignPicturePasswordTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility")

    def _create_learner(self, username):
        return FacilityUser.objects.create(
            username=username,
            facility=self.facility,
        )

    def test_assigns_a_valid_sequence(self):
        learner = self._create_learner("learner1")
        assign_picture_password(learner, self.facility)
        learner.refresh_from_db()
        all_sequences = get_all_valid_sequences(PICTURE_PASSWORD_SET)
        self.assertIn(learner.picture_password, all_sequences)

    def test_assigned_sequence_not_already_present(self):
        existing = self._create_learner("existing")
        existing.picture_password = "1.2.3"
        existing.save(update_fields=["picture_password"])

        new_learner = self._create_learner("new")
        assign_picture_password(new_learner, self.facility)
        new_learner.refresh_from_db()
        self.assertNotEqual(new_learner.picture_password, existing.picture_password)

    def test_assigns_unique_sequences_to_multiple_learners(self):
        learners = [self._create_learner(f"l{i}") for i in range(10)]
        for learner in learners:
            assign_picture_password(learner, self.facility)

        passwords = [
            l.picture_password
            for l in FacilityUser.objects.filter(
                pk__in=[l.pk for l in learners],
            )
        ]
        self.assertEqual(len(passwords), len(set(passwords)))

    def test_exhausted_pool_reclaims_from_longest_deleted_learner(self):
        small_set = {1: {}, 2: {}, 3: {}}
        all_seqs = sorted(get_all_valid_sequences(small_set))
        holders = []
        for i, seq in enumerate(all_seqs):
            learner = self._create_learner(f"reclaim{i}")
            learner.picture_password = seq
            learner.save(update_fields=["picture_password"])
            holders.append(learner)

        oldest, newer = holders[0], holders[1]
        oldest.date_deleted = now() - timedelta(days=10)
        oldest.save()
        newer.date_deleted = now() - timedelta(days=1)
        newer.save()
        oldest_sequence = oldest.picture_password

        overflow_learner = self._create_learner("reclaim_overflow")
        with mock.patch(
            "kolibri.core.auth.utils.picture_passwords.PICTURE_PASSWORD_SET",
            small_set,
        ):
            assign_picture_password(overflow_learner, self.facility)

        overflow_learner.refresh_from_db()
        self.assertEqual(overflow_learner.picture_password, oldest_sequence)
        self.assertIsNone(FacilityUser.all_objects.get(pk=oldest.pk).picture_password)
        self.assertIsNotNone(FacilityUser.all_objects.get(pk=newer.pk).picture_password)

    def test_get_available_sequence_does_not_reclaim(self):
        small_set = {1: {}, 2: {}, 3: {}}
        all_seqs = sorted(get_all_valid_sequences(small_set))
        for i, seq in enumerate(all_seqs):
            learner = self._create_learner(f"readonly{i}")
            learner.picture_password = seq
            learner.save(update_fields=["picture_password"])
            if i == 0:
                holder = learner
        holder.date_deleted = now() - timedelta(days=10)
        holder.save()

        with mock.patch(
            "kolibri.core.auth.utils.picture_passwords.PICTURE_PASSWORD_SET",
            small_set,
        ):
            with self.assertRaises(NoAvailableSequences):
                get_available_sequence(self.facility)

        self.assertEqual(
            all_seqs[0],
            FacilityUser.all_objects.get(pk=holder.pk).picture_password,
        )

    def test_raises_no_available_sequences_when_pool_exhausted(self):
        small_set = {1: {}, 2: {}, 3: {}}
        all_seqs = sorted(get_all_valid_sequences(small_set))
        for i, seq in enumerate(all_seqs):
            learner = self._create_learner(f"fill{i}")
            learner.picture_password = seq
            learner.save(update_fields=["picture_password"])

        overflow_learner = self._create_learner("overflow")
        with mock.patch(
            "kolibri.core.auth.utils.picture_passwords.PICTURE_PASSWORD_SET",
            small_set,
        ):
            with self.assertRaises(NoAvailableSequences):
                assign_picture_password(overflow_learner, self.facility)

    def test_retry_reclaims_when_the_pool_empties_mid_assignment(self):
        holder = self._create_learner("retry_holder")
        holder.picture_password = "1.2.3"
        holder.save(update_fields=["picture_password"])
        holder.date_deleted = now() - timedelta(days=5)
        holder.save()

        learner = self._create_learner("retry_learner")
        real_save = learner.save
        calls = []

        def collide_once(*args, **kwargs):
            calls.append(1)
            if len(calls) == 1:
                raise IntegrityError()
            return real_save(*args, **kwargs)

        with mock.patch(
            "kolibri.core.auth.utils.picture_passwords.get_available_sequence",
            side_effect=["4.5.6", NoAvailableSequences()],
        ):
            with mock.patch.object(learner, "save", side_effect=collide_once):
                assign_picture_password(learner, self.facility)

        self.assertEqual(
            "1.2.3",
            FacilityUser.objects.values_list("picture_password", flat=True).get(
                pk=learner.pk
            ),
        )
        self.assertIsNone(FacilityUser.all_objects.get(pk=holder.pk).picture_password)

    def test_raises_sequence_already_assigned_after_two_integrity_errors(self):
        learner = self._create_learner("collision")
        with mock.patch(
            "kolibri.core.auth.utils.picture_passwords.get_available_sequence",
            side_effect=["1.2.3", "1.2.4"],
        ):
            with mock.patch.object(
                learner,
                "save",
                side_effect=[IntegrityError(), IntegrityError()],
            ):
                with self.assertRaises(SequenceAlreadyAssigned):
                    assign_picture_password(learner, self.facility)

    def test_persists_to_database(self):
        learner = self._create_learner("persist")
        assign_picture_password(learner, self.facility)
        db_value = FacilityUser.objects.values_list("picture_password", flat=True).get(
            pk=learner.pk
        )
        self.assertIsNotNone(db_value)
        self.assertEqual(learner.picture_password, db_value)


class PicturePasswordsExhaustionTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.learner_sequence = 0

    def _create_user(self):
        """
        :return: FacilityUser object
        :rtype: FacilityUser
        """
        self.learner_sequence += 1
        return FacilityUser.objects.create(
            username=f"user_{self.learner_sequence}",
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_get_learner_count__basic(self):
        self._create_user()
        self._create_user()
        self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 3)

    def test_get_learner_count__no_superusers(self):
        create_superuser(self.facility)
        self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 1)

    def test_get_learner_count__no_roles(self):
        self._create_user()
        admin = self._create_user()
        self.facility.add_role(admin, ADMIN)
        self.assertEqual(get_learner_count(self.facility.dataset_id), 1)

    def test_get_learner_count__user_signals(self):
        self._create_user()
        self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 2)
        user_x = self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 3)
        user_x.delete()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 2)

    def test_get_learner_count__role_signals(self):
        self._create_user()
        admin = self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 2)
        self.facility.add_role(admin, ADMIN)
        self.assertEqual(get_learner_count(self.facility.dataset_id), 1)

    @mute_signals(post_save)
    def test_get_learner_count__cache_and_clear(self):
        get_learner_count.clear(self.facility.dataset_id)
        self._create_user()
        self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 2)
        self._create_user()
        self.assertEqual(get_learner_count(self.facility.dataset_id), 2)
        get_learner_count.clear(self.facility.dataset_id)
        self.assertEqual(get_learner_count(self.facility.dataset_id), 3)

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_are_picture_passwords_exhausted__false(self):
        self._create_user()
        self.assertFalse(are_picture_passwords_exhausted(self.facility.dataset_id))

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_are_picture_passwords_exhausted__true(self):
        self._create_user()
        self._create_user()
        self.assertTrue(are_picture_passwords_exhausted(self.facility.dataset_id))
