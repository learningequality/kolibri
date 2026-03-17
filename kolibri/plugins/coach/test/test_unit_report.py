import datetime
import uuid
from unittest.mock import patch

from django.test import SimpleTestCase
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import TestStatus
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.plugins.coach.unit_report_api import TEST_STATUS_CLOSED
from kolibri.plugins.coach.unit_report_api import TEST_STATUS_NOT_ACTIVATED
from kolibri.plugins.coach.unit_report_api import TEST_STATUS_OPEN
from kolibri.plugins.coach.unit_report_api import _compute_all_test_scores
from kolibri.plugins.coach.unit_report_api import _get_test_status
from kolibri.plugins.coach.unit_report_api import get_synthetic_content_id
from kolibri.plugins.coach.unit_report_api import get_test_version

DUMMY_PASSWORD = "password"

URL_NAME = "kolibri:kolibri.plugins.coach:unitreport"


def _make_url(course_session_id, unit_contentnode_id):
    # Strip dashes so the IDs match the [0-9a-f]{32} pattern in api_urls.py.
    return reverse(
        URL_NAME,
        kwargs={
            "course_session_id": course_session_id.replace("-", ""),
            "unit_contentnode_id": unit_contentnode_id.replace("-", ""),
        },
    )



# Fixed UUIDs so test failures are reproducible across runs.
LO1_ID = "00000000000000000000000000000011"
LO2_ID = "00000000000000000000000000000022"

# Version A items: 2 for LO1, 1 for LO2
ITEM_A1 = "0000000000000000000000000000a001"
ITEM_A2 = "0000000000000000000000000000a002"
ITEM_A3 = "0000000000000000000000000000a003" 

# Version B items: 2 for LO1, 1 for LO2
ITEM_B1 = "0000000000000000000000000000b001"
ITEM_B2 = "0000000000000000000000000000b002"
ITEM_B3 = "0000000000000000000000000000b003" 

ASSESSMENT_OBJECTIVES = {
    ITEM_A1: LO1_ID,
    ITEM_A2: LO1_ID,
    ITEM_A3: LO2_ID,
    ITEM_B1: LO1_ID,
    ITEM_B2: LO1_ID,
    ITEM_B3: LO2_ID,
}

UNIT_OPTIONS = {
    "learning_objectives": [
        {"id": LO1_ID, "text": "Understand fractions"},
        {"id": LO2_ID, "text": "Add fractions"},
    ],
    "assessment_objectives": ASSESSMENT_OBJECTIVES,
    "completion_criteria": {
        "threshold": {
            "pre_post_test": {
                "assessment_item_ids": [ITEM_A1, ITEM_A2, ITEM_A3, ITEM_B1, ITEM_B2, ITEM_B3],
                "version_a_item_ids": [ITEM_A1, ITEM_A2, ITEM_A3],
                "version_b_item_ids": [ITEM_B1, ITEM_B2, ITEM_B3],
            }
        }
    },
}


def _make_content_node(parent_id=None):
    node = ContentNode.objects.create(
        id=uuid.uuid4().hex,
        content_id=uuid.uuid4().hex,
        channel_id=uuid.uuid4().hex,
        title="Test Unit",
        kind=content_kinds.EXERCISE,
        modality=modalities.UNIT,
        options=UNIT_OPTIONS,
        available=True,
    )
    return node


def _create_attempt(learner, course_session_id, unit_id, test_type, items_correct, items_incorrect=None):
    """
    Create ContentSummaryLog + MasteryLog + AttemptLogs for a learner's test attempt.

    items_correct: list of item IDs answered correctly
    items_incorrect: list of item IDs answered incorrectly (optional)
    """
    synthetic_cid = get_synthetic_content_id(
        str(learner.id), str(course_session_id), str(unit_id), test_type
    )
    now = timezone.now()
    channel_id = uuid.uuid4().hex

    summary_log = ContentSummaryLog.objects.create(
        user=learner,
        content_id=synthetic_cid,
        channel_id=channel_id,
        start_timestamp=now - datetime.timedelta(minutes=30),
        end_timestamp=now,
        kind=content_kinds.EXERCISE,
        progress=1.0,
    )
    session_log = ContentSessionLog.objects.create(
        user=learner,
        content_id=synthetic_cid,
        channel_id=channel_id,
        start_timestamp=now - datetime.timedelta(minutes=30),
        end_timestamp=now,
        kind=content_kinds.EXERCISE,
    )
    mastery_log = MasteryLog.objects.create(
        user=learner,
        summarylog=summary_log,
        mastery_criterion={"type": "quiz"},
        start_timestamp=now - datetime.timedelta(minutes=30),
        end_timestamp=now,
        completion_timestamp=now,
        mastery_level=-1,
        complete=True,
    )

    all_items = [(item, 1) for item in (items_correct or [])]
    all_items += [(item, 0) for item in (items_incorrect or [])]

    for i, (item, correct) in enumerate(all_items):
        offset = datetime.timedelta(minutes=i * 2)
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=learner,
            item=item,
            start_timestamp=now - datetime.timedelta(minutes=30) + offset,
            end_timestamp=now - datetime.timedelta(minutes=30) + offset + datetime.timedelta(minutes=1),
            correct=correct,
        )

    return mastery_log



class GetTestVersionTests(SimpleTestCase):
    """get_test_version returns deterministic 'a' or 'b'."""

    def test_deterministic(self):
        lid = uuid.uuid4().hex
        sid = uuid.uuid4().hex
        uid = uuid.uuid4().hex
        v1 = get_test_version(lid, sid, uid)
        v2 = get_test_version(lid, sid, uid)
        self.assertEqual(v1, v2)
        self.assertIn(v1, ("a", "b"))

    def test_hash_byte_below_128_returns_version_a(self):
        # Directly exercise the branch: first SHA-256 byte < 128 → "a".
        with patch("kolibri.plugins.coach.unit_report_api.hashlib") as mock_hashlib:
            mock_hashlib.sha256.return_value.digest.return_value = bytes([0]) + b"\x00" * 31
            self.assertEqual(get_test_version("lid", "sid", "uid"), "a")

    def test_hash_byte_128_or_above_returns_version_b(self):
        # Directly exercise the branch: first SHA-256 byte >= 128 → "b".
        with patch("kolibri.plugins.coach.unit_report_api.hashlib") as mock_hashlib:
            mock_hashlib.sha256.return_value.digest.return_value = bytes([255]) + b"\x00" * 31
            self.assertEqual(get_test_version("lid", "sid", "uid"), "b")


class GetTestStatusTests(SimpleTestCase):
    """_get_test_status maps UnitTestAssignment state to response strings."""

    def _make_assignment(self, is_active, status):
        a = UnitTestAssignment.__new__(UnitTestAssignment)
        a.is_active = is_active
        a.status = status
        return a

    def test_no_assignments_returns_not_activated(self):
        self.assertEqual(_get_test_status([]), TEST_STATUS_NOT_ACTIVATED)

    def test_active_assignment_returns_open(self):
        a = self._make_assignment(True, TestStatus.Active)
        self.assertEqual(_get_test_status([a]), TEST_STATUS_OPEN)

    def test_ended_assignment_returns_closed(self):
        a = self._make_assignment(False, TestStatus.Ended)
        self.assertEqual(_get_test_status([a]), TEST_STATUS_CLOSED)

    def test_mixed_active_ended_returns_open(self):
        a1 = self._make_assignment(True, TestStatus.Active)
        a2 = self._make_assignment(False, TestStatus.Ended)
        self.assertEqual(_get_test_status([a1, a2]), TEST_STATUS_OPEN)

    def test_not_started_assignment_returns_not_activated(self):
        """An assignment that exists but has never been opened must not be reported as closed."""
        a = self._make_assignment(False, TestStatus.NotStarted)
        self.assertEqual(_get_test_status([a]), TEST_STATUS_NOT_ACTIVATED)


class ComputeTestScoresTests(TestCase):
    """_compute_all_test_scores aggregation logic without HTTP layer."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        from kolibri.core.auth.test.test_api import FacilityFactory

        cls.facility = FacilityFactory.create()
        cls.classroom = Classroom.objects.create(name="cls", parent=cls.facility)
        cls.learner_a = helpers.create_learner("la", DUMMY_PASSWORD, cls.facility, cls.classroom)
        cls.learner_b = helpers.create_learner("lb", DUMMY_PASSWORD, cls.facility, cls.classroom)

    def setUp(self):
        # Generate fresh IDs per test so that each test's synthetic content_ids
        # are unique, eliminating any risk of ContentSummaryLog UNIQUE-constraint
        # collisions between tests that share the same learner objects.
        self.course_session_id = uuid.uuid4().hex
        self.unit_id = uuid.uuid4().hex

    def test_no_learners_returns_empty(self):
        result = _compute_all_test_scores([], self.course_session_id, self.unit_id, ASSESSMENT_OBJECTIVES)
        self.assertEqual(result["pre"], {})
        self.assertEqual(result["post"], {})

    def test_unattempted_learner_absent_from_scores(self):
        result = _compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )
        self.assertNotIn(str(self.learner_a.id), result["pre"])
        self.assertNotIn(str(self.learner_a.id), result["post"])

    def test_correct_answers_counted_per_lo(self):
        # Determine which version learner_a will get
        version = get_test_version(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id)
        )
        if version == "a":
            items_correct = [ITEM_A1, ITEM_A2]  # 2 correct for LO1
            items_incorrect = [ITEM_A3]          # 0 correct for LO2
        else:
            items_correct = [ITEM_B1, ITEM_B2]
            items_incorrect = [ITEM_B3]

        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=items_correct,
            items_incorrect=items_incorrect,
        )
        result = _compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["pre"]
        lid = str(self.learner_a.id)
        self.assertIn(lid, result)
        self.assertEqual(result[lid].get(LO1_ID, 0), 2)
        self.assertEqual(result[lid].get(LO2_ID, 0), 0)

    def test_attempted_with_zero_correct_included_as_empty_dict(self):
        version = get_test_version(
            str(self.learner_b.id), str(self.course_session_id), str(self.unit_id)
        )
        if version == "a":
            items_incorrect = [ITEM_A1, ITEM_A2, ITEM_A3]
        else:
            items_incorrect = [ITEM_B1, ITEM_B2, ITEM_B3]

        _create_attempt(
            self.learner_b,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[],
            items_incorrect=items_incorrect,
        )
        result = _compute_all_test_scores(
            [self.learner_b.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["pre"]
        # Learner attempted but got 0 correct – should appear with empty scores dict
        self.assertIn(str(self.learner_b.id), result)
        self.assertEqual(result[str(self.learner_b.id)], {})

    def test_only_complete_mastery_logs_counted(self):
        """Incomplete (in-progress) mastery logs are ignored."""
        synthetic_cid = get_synthetic_content_id(
            str(self.learner_a.id),
            str(self.course_session_id),
            str(self.unit_id),
            "post",
        )
        now = timezone.now()
        channel_id = uuid.uuid4().hex
        summary_log = ContentSummaryLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=10),
            kind=content_kinds.EXERCISE,
        )
        session_log = ContentSessionLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=10),
            kind=content_kinds.EXERCISE,
        )
        incomplete_mastery = MasteryLog.objects.create(
            user=self.learner_a,
            summarylog=summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=now - datetime.timedelta(minutes=10),
            mastery_level=-2,
            complete=False,  # still in progress
        )
        version = get_test_version(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id)
        )
        item = ITEM_A1 if version == "a" else ITEM_B1
        AttemptLog.objects.create(
            masterylog=incomplete_mastery,
            sessionlog=session_log,
            user=self.learner_a,
            item=item,
            start_timestamp=now - datetime.timedelta(minutes=5),
            end_timestamp=now,
            correct=1,
        )

        result = _compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        self.assertNotIn(str(self.learner_a.id), result)

    def test_pre_and_post_are_independent(self):
        """Pre-test data does not bleed into post-test scores."""
        version = get_test_version(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id)
        )
        items_correct = [ITEM_A1, ITEM_A2, ITEM_A3] if version == "a" else [ITEM_B1, ITEM_B2, ITEM_B3]

        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=items_correct,
        )

        post_result = _compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        self.assertNotIn(str(self.learner_a.id), post_result)

    def test_duplicate_attempt_items_counted_once(self):
        """When the same item appears twice in a mastery log, only the most recent attempt counts."""
        version = get_test_version(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id)
        )
        item = ITEM_A1 if version == "a" else ITEM_B1

        synthetic_cid = get_synthetic_content_id(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id), "pre"
        )
        now = timezone.now()
        channel_id = uuid.uuid4().hex
        summary_log = ContentSummaryLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
            progress=1.0,
        )
        session_log = ContentSessionLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
        )
        mastery_log = MasteryLog.objects.create(
            user=self.learner_a,
            summarylog=summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            completion_timestamp=now,
            mastery_level=-1,
            complete=True,
        )
        # First attempt on the item: incorrect (earlier timestamp)
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=self.learner_a,
            item=item,
            start_timestamp=now - datetime.timedelta(minutes=20),
            end_timestamp=now - datetime.timedelta(minutes=19),
            correct=0,
        )
        # Second attempt on the same item: correct (later timestamp — this one should win)
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=self.learner_a,
            item=item,
            start_timestamp=now - datetime.timedelta(minutes=10),
            end_timestamp=now - datetime.timedelta(minutes=9),
            correct=1,
        )

        result = _compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["pre"]
        lid = str(self.learner_a.id)
        self.assertIn(lid, result)
        # The most-recent attempt is correct, so LO1 should have exactly 1 (not 2).
        self.assertEqual(result[lid].get(LO1_ID, 0), 1)

    def test_partial_credit_not_counted(self):
        """correct=0.5 (partial credit) is excluded; only correct==1 counts."""
        synthetic_cid = get_synthetic_content_id(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id), "pre"
        )
        now = timezone.now()
        channel_id = uuid.uuid4().hex
        summary_log = ContentSummaryLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
            progress=1.0,
        )
        session_log = ContentSessionLog.objects.create(
            user=self.learner_a,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
        )
        mastery_log = MasteryLog.objects.create(
            user=self.learner_a,
            summarylog=summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            completion_timestamp=now,
            mastery_level=-1,
            complete=True,
        )
        version = get_test_version(
            str(self.learner_a.id), str(self.course_session_id), str(self.unit_id)
        )
        item = ITEM_A1 if version == "a" else ITEM_B1
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=self.learner_a,
            item=item,
            start_timestamp=now - datetime.timedelta(minutes=20),
            end_timestamp=now - datetime.timedelta(minutes=19),
            correct=0.5,  # partial credit — must NOT count
        )
        result = _compute_all_test_scores(
            [self.learner_a.id], self.course_session_id, self.unit_id, ASSESSMENT_OBJECTIVES
        )["pre"]
        lid = str(self.learner_a.id)
        # Learner appears (complete mastery log) but LO1 score is 0 — partial credit excluded.
        self.assertIn(lid, result)
        self.assertEqual(result[lid].get(LO1_ID, 0), 0)

    def test_only_most_recent_complete_mastery_log_used(self):
        """When a learner has multiple complete mastery logs (retakes), only the most recent is used."""
        version = get_test_version(
            str(self.learner_b.id), str(self.course_session_id), str(self.unit_id)
        )
        # All items for this version — used in both mastery logs (correct in the
        # first, incorrect in the second).  Named all_items, not items_correct, to
        # avoid confusion when they're iterated with correct=0 below.
        all_items = [ITEM_A1, ITEM_A2, ITEM_A3] if version == "a" else [ITEM_B1, ITEM_B2, ITEM_B3]

        # Build both mastery logs manually so they share the same ContentSummaryLog
        # (which is required — two ContentSummaryLogs for the same content_id would
        # violate the morango UNIQUE constraint on source_id = content_id).
        synthetic_cid = get_synthetic_content_id(
            str(self.learner_b.id), str(self.course_session_id), str(self.unit_id), "post"
        )
        now = timezone.now()
        later = now + datetime.timedelta(hours=1)
        channel_id = uuid.uuid4().hex

        shared_summary_log = ContentSummaryLog.objects.create(
            user=self.learner_b,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=later,
            kind=content_kinds.EXERCISE,
            progress=1.0,
        )
        session_log1 = ContentSessionLog.objects.create(
            user=self.learner_b,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            kind=content_kinds.EXERCISE,
        )
        session_log2 = ContentSessionLog.objects.create(
            user=self.learner_b,
            content_id=synthetic_cid,
            channel_id=channel_id,
            start_timestamp=later - datetime.timedelta(minutes=30),
            end_timestamp=later,
            kind=content_kinds.EXERCISE,
        )

        # First (earlier) mastery log: all correct
        mastery_log1 = MasteryLog.objects.create(
            user=self.learner_b,
            summarylog=shared_summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=now - datetime.timedelta(minutes=30),
            end_timestamp=now,
            completion_timestamp=now,
            mastery_level=-1,
            complete=True,
        )
        for i, item in enumerate(all_items):
            offset = datetime.timedelta(minutes=i * 2)
            AttemptLog.objects.create(
                masterylog=mastery_log1,
                sessionlog=session_log1,
                user=self.learner_b,
                item=item,
                start_timestamp=now - datetime.timedelta(minutes=30) + offset,
                end_timestamp=now - datetime.timedelta(minutes=30) + offset + datetime.timedelta(minutes=1),
                correct=1,
            )

        # Second (later) mastery log on the same summary log: all incorrect
        mastery_log2 = MasteryLog.objects.create(
            user=self.learner_b,
            summarylog=shared_summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=later - datetime.timedelta(minutes=30),
            end_timestamp=later,
            completion_timestamp=later,
            mastery_level=-2,  # different level to avoid source_id collision
            complete=True,
        )
        for i, item in enumerate(all_items):
            offset = datetime.timedelta(minutes=i * 2)
            AttemptLog.objects.create(
                masterylog=mastery_log2,
                sessionlog=session_log2,
                user=self.learner_b,
                item=item,
                start_timestamp=later - datetime.timedelta(minutes=30) + offset,
                end_timestamp=later - datetime.timedelta(minutes=30) + offset + datetime.timedelta(minutes=1),
                correct=0,
            )

        result = _compute_all_test_scores(
            [self.learner_b.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        lid = str(self.learner_b.id)
        # Most recent log has 0 correct — scores dict should be present but empty.
        self.assertIn(lid, result)
        self.assertEqual(result[lid], {})


# ---------------------------------------------------------------------------
# API integration tests
# ---------------------------------------------------------------------------


class UnitReportAPIBase(APITestCase):
    """Shared setup for API-level tests."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        from kolibri.core.auth.test.test_api import FacilityFactory

        cls.facility = FacilityFactory.create()
        cls.classroom = Classroom.objects.create(name="classroom", parent=cls.facility)

        cls.facility_admin = helpers.create_facility_admin("fadmin", DUMMY_PASSWORD, cls.facility)
        cls.facility_coach = helpers.create_coach(
            "fcoach", DUMMY_PASSWORD, cls.facility, is_facility_coach=True
        )
        cls.classroom_coach = helpers.create_coach(
            "ccoach", DUMMY_PASSWORD, cls.facility, classroom=cls.classroom
        )
        cls.other_classroom = Classroom.objects.create(name="other", parent=cls.facility)
        cls.other_coach = helpers.create_coach(
            "ocoach", DUMMY_PASSWORD, cls.facility, classroom=cls.other_classroom
        )
        cls.learner1 = helpers.create_learner("l1", DUMMY_PASSWORD, cls.facility, cls.classroom)
        cls.learner2 = helpers.create_learner("l2", DUMMY_PASSWORD, cls.facility, cls.classroom)
        cls.learner3 = helpers.create_learner("l3", DUMMY_PASSWORD, cls.facility, cls.classroom)

        # Course node (parent) and unit node
        cls.course_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            title="Test Course",
            kind=content_kinds.TOPIC,
            modality=modalities.COURSE,
            available=True,
        )
        cls.unit_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            title="Unit 1: Fractions",
            kind=content_kinds.EXERCISE,
            modality=modalities.UNIT,
            options=UNIT_OPTIONS,
            available=True,
            parent=cls.course_node,
        )

        # Course session for the classroom
        cls.course_session = CourseSession.objects.create(
            course=cls.course_node.id,
            title="Spring 2025",
            collection=cls.classroom,
            created_by=cls.facility_admin,
            is_active=True,
        )
        # Assign the whole classroom to the course session
        CourseSessionAssignment.objects.create(
            course_session=cls.course_session,
            collection=cls.classroom,
            assigned_by=cls.facility_admin,
        )

    def _get_url(self):
        return _make_url(self.course_session.id, self.unit_node.id)


class UnitReportPermissionTests(UnitReportAPIBase):
    """Verify who can and cannot access the endpoint."""

    def test_anon_cannot_access(self):
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access(self):
        self.client.login(username=self.learner1.username, password=DUMMY_PASSWORD)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 403)

    def test_coach_of_different_classroom_cannot_access(self):
        self.client.login(username=self.other_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_can_access(self):
        self.client.login(username=self.classroom_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access(self):
        self.client.login(username=self.facility_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access(self):
        self.client.login(username=self.facility_admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_nonexistent_course_session_returns_403(self):
        url = _make_url(uuid.uuid4().hex, self.unit_node.id)
        self.client.login(username=self.facility_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_nonexistent_unit_returns_404(self):
        url = _make_url(self.course_session.id, uuid.uuid4().hex)
        self.client.login(username=self.facility_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
