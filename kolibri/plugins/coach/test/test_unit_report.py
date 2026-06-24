import copy
import datetime
import uuid

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id
from kolibri.plugins.coach.viewsets.unit_report import compute_all_test_scores
from kolibri.plugins.coach.viewsets.unit_report import get_test_status
from kolibri.plugins.coach.viewsets.unit_report import TEST_STATUS_CLOSED
from kolibri.plugins.coach.viewsets.unit_report import TEST_STATUS_NOT_ACTIVATED
from kolibri.plugins.coach.viewsets.unit_report import TEST_STATUS_OPEN

from . import helpers

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

ITEM_A4 = "0000000000000000000000000000a004"

# Version B items: 2 for LO1, 1 for LO2
ITEM_B1 = "0000000000000000000000000000b001"
ITEM_B2 = "0000000000000000000000000000b002"
ITEM_B3 = "0000000000000000000000000000b003"

ITEM_B4 = "0000000000000000000000000000b004"

ASSESSMENT_OBJECTIVES = {
    ITEM_A1: [LO1_ID],
    ITEM_A2: [LO1_ID],
    ITEM_A3: [LO2_ID],
    ITEM_B1: [LO1_ID],
    ITEM_B2: [LO1_ID],
    ITEM_B3: [LO2_ID],
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
                "assessment_item_ids": [
                    ITEM_A1,
                    ITEM_A2,
                    ITEM_A3,
                    ITEM_B1,
                    ITEM_B2,
                    ITEM_B3,
                ],
                "version_a_item_ids": [ITEM_A1, ITEM_A2, ITEM_A3],
                "version_b_item_ids": [ITEM_B1, ITEM_B2, ITEM_B3],
            }
        }
    },
}

MULTI_LO_ASSESSMENT_OBJECTIVES = {
    **ASSESSMENT_OBJECTIVES,
    ITEM_A4: [LO1_ID, LO2_ID],
    ITEM_B4: [LO1_ID, LO2_ID],
}

MULTI_LO_UNIT_OPTIONS = copy.deepcopy(UNIT_OPTIONS)
MULTI_LO_UNIT_OPTIONS["assessment_objectives"] = MULTI_LO_ASSESSMENT_OBJECTIVES
_ppt = MULTI_LO_UNIT_OPTIONS["completion_criteria"]["threshold"]["pre_post_test"]
_ppt["assessment_item_ids"] += [ITEM_A4, ITEM_B4]
_ppt["version_a_item_ids"] += [ITEM_A4]
_ppt["version_b_item_ids"] += [ITEM_B4]


def _create_attempt(
    learner, course_session_id, unit_id, test_type, items_correct, items_incorrect=None
):
    """
    Create ContentSummaryLog + MasteryLog + AttemptLogs for a learner's test attempt.

    items_correct: list of item IDs answered correctly
    items_incorrect: list of item IDs answered incorrectly (optional)
    """
    synthetic_cid = get_synthetic_content_id(
        str(course_session_id), str(unit_id), test_type
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
    # ContentSessionLog is required to satisfy the AttemptLog FK; it is not
    # queried by the system under test.
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
            end_timestamp=now
            - datetime.timedelta(minutes=30)
            + offset
            + datetime.timedelta(minutes=1),
            correct=correct,
        )

    return mastery_log


class GetTestStatusTests(TestCase):
    """get_test_status maps a UnitTestAssignment queryset to a response string."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.classroom = Classroom.objects.create(name="cls", parent=cls.facility)
        cls.group = LearnerGroup.objects.create(name="grp", parent=cls.classroom)
        cls.coach = helpers.create_coach(
            "status_coach", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.course_session = CourseSession.objects.create(
            course=uuid.uuid4().hex,
            title="Status Test",
            collection=cls.classroom,
            created_by=cls.coach,
        )
        cls.unit_id = uuid.uuid4().hex

    def _qs(self):
        return UnitTestAssignment.objects.filter(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            test_type="pre",
        )

    def _make_assignment(self, closed, collection=None):
        return UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_id,
            collection=collection or self.classroom,
            test_type="pre",
            closed=closed,
            activated_by=self.coach,
        )

    def test_no_assignments_returns_not_activated(self):
        self.assertEqual(get_test_status(self._qs()), TEST_STATUS_NOT_ACTIVATED)

    def test_active_assignment_returns_open(self):
        self._make_assignment(closed=False)
        self.assertEqual(get_test_status(self._qs()), TEST_STATUS_OPEN)

    def test_closed_assignment_returns_closed(self):
        self._make_assignment(closed=True)
        self.assertEqual(get_test_status(self._qs()), TEST_STATUS_CLOSED)

    def test_all_closed_assignments_returns_closed(self):
        self._make_assignment(closed=True)
        self._make_assignment(closed=True, collection=self.group)
        self.assertEqual(get_test_status(self._qs()), TEST_STATUS_CLOSED)

    def test_mixed_returns_open(self):
        self._make_assignment(closed=False)
        self._make_assignment(closed=True, collection=self.group)
        self.assertEqual(get_test_status(self._qs()), TEST_STATUS_OPEN)


class ComputeTestScoresTests(TestCase):
    """compute_all_test_scores aggregation logic without HTTP layer."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.classroom = Classroom.objects.create(name="cls", parent=cls.facility)
        cls.learner_a = helpers.create_learner(
            "la", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.learner_b = helpers.create_learner(
            "lb", DUMMY_PASSWORD, cls.facility, cls.classroom
        )

    def setUp(self):
        # Generate fresh IDs per test so that each test's synthetic content_ids
        # are unique, eliminating any risk of ContentSummaryLog UNIQUE-constraint
        # collisions between tests that share the same learner objects.
        self.course_session_id = uuid.uuid4().hex
        self.unit_id = uuid.uuid4().hex

    def test_no_learners_returns_empty(self):
        result = compute_all_test_scores(
            [], self.course_session_id, self.unit_id, ASSESSMENT_OBJECTIVES
        )
        self.assertEqual(result["pre"], {})
        self.assertEqual(result["post"], {})

    def test_unattempted_learner_absent_from_scores(self):
        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )
        self.assertNotIn(str(self.learner_a.id), result["pre"])
        self.assertNotIn(str(self.learner_a.id), result["post"])

    def test_correct_answers_counted_per_lo(self):
        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[ITEM_A1, ITEM_A2],  # 2 correct for LO1
            items_incorrect=[ITEM_A3],  # 0 correct for LO2
        )
        result = compute_all_test_scores(
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
        _create_attempt(
            self.learner_b,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[],
            items_incorrect=[ITEM_A1, ITEM_A2, ITEM_A3],
        )
        result = compute_all_test_scores(
            [self.learner_b.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["pre"]
        # Learner attempted but got 0 correct – should appear with empty scores dict
        self.assertIn(str(self.learner_b.id), result)
        self.assertEqual(result[str(self.learner_b.id)], {})

    def test_incomplete_mastery_log_excluded(self):
        """Mastery logs with complete=False are ignored even when end_timestamp is set."""
        synthetic_cid = get_synthetic_content_id(
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
            end_timestamp=now,
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
            end_timestamp=now,  # has end_timestamp but complete=False
            mastery_level=-2,
            complete=False,  # still in progress — must be excluded
        )
        AttemptLog.objects.create(
            masterylog=incomplete_mastery,
            sessionlog=session_log,
            user=self.learner_a,
            item=ITEM_A1,
            start_timestamp=now - datetime.timedelta(minutes=5),
            end_timestamp=now,
            correct=1,
        )

        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        self.assertNotIn(str(self.learner_a.id), result)

    def test_mastery_log_without_end_timestamp_excluded(self):
        """Mastery logs with complete=True but no end_timestamp are ignored."""
        synthetic_cid = get_synthetic_content_id(
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
        mastery_no_end = MasteryLog.objects.create(
            user=self.learner_a,
            summarylog=summary_log,
            mastery_criterion={"type": "quiz"},
            start_timestamp=now - datetime.timedelta(minutes=10),
            # end_timestamp intentionally omitted — must be excluded
            mastery_level=-2,
            complete=True,
        )
        AttemptLog.objects.create(
            masterylog=mastery_no_end,
            sessionlog=session_log,
            user=self.learner_a,
            item=ITEM_A1,
            start_timestamp=now - datetime.timedelta(minutes=5),
            end_timestamp=now,
            correct=1,
        )

        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        self.assertNotIn(str(self.learner_a.id), result)

    def test_pre_and_post_are_independent(self):
        """Pre-test data does not bleed into post-test scores."""
        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[ITEM_A1, ITEM_A2, ITEM_A3],
        )

        post_result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        self.assertNotIn(str(self.learner_a.id), post_result)

    def test_duplicate_attempt_items_counted_once(self):
        """When the same item appears twice in a mastery log, only the most recent attempt counts."""
        # Set up a complete mastery log with ITEM_A1 answered incorrectly.
        mastery_log = _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[],
            items_incorrect=[ITEM_A1],
        )
        # Add a second (later, correct) attempt on the same item to the same mastery log.
        session_log = ContentSessionLog.objects.filter(
            user=self.learner_a,
            content_id=mastery_log.summarylog.content_id,
        ).first()
        now = timezone.now()
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=self.learner_a,
            item=ITEM_A1,
            start_timestamp=now,
            end_timestamp=now + datetime.timedelta(minutes=1),
            correct=1,
        )

        result = compute_all_test_scores(
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
        # Set up a complete mastery log with ITEM_A2 correct (LO1) to confirm the
        # learner appears in results, then add a partial-credit attempt on ITEM_A1.
        mastery_log = _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[ITEM_A2],
        )
        session_log = ContentSessionLog.objects.filter(
            user=self.learner_a,
            content_id=mastery_log.summarylog.content_id,
        ).first()
        now = timezone.now()
        AttemptLog.objects.create(
            masterylog=mastery_log,
            sessionlog=session_log,
            user=self.learner_a,
            item=ITEM_A1,
            start_timestamp=now,
            end_timestamp=now + datetime.timedelta(minutes=1),
            correct=0.5,  # partial credit — must NOT count
        )
        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["pre"]
        lid = str(self.learner_a.id)
        # Learner appears (complete mastery log); ITEM_A2 counts (1), ITEM_A1 partial does not.
        self.assertIn(lid, result)
        self.assertEqual(
            result[lid].get(LO1_ID, 0), 1
        )  # ITEM_A2 correct, ITEM_A1 excluded

    def test_only_most_recent_complete_mastery_log_used(self):
        """When a learner has multiple complete mastery logs (retakes), only the most recent is used."""
        all_items = [ITEM_A1, ITEM_A2, ITEM_A3]

        # Build both mastery logs manually so they share the same ContentSummaryLog
        # (which is required — two ContentSummaryLogs for the same content_id would
        # violate the morango UNIQUE constraint on source_id = content_id).
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session_id),
            str(self.unit_id),
            "post",
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
                end_timestamp=now
                - datetime.timedelta(minutes=30)
                + offset
                + datetime.timedelta(minutes=1),
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
                end_timestamp=later
                - datetime.timedelta(minutes=30)
                + offset
                + datetime.timedelta(minutes=1),
                correct=0,
            )

        result = compute_all_test_scores(
            [self.learner_b.id],
            self.course_session_id,
            self.unit_id,
            ASSESSMENT_OBJECTIVES,
        )["post"]
        lid = str(self.learner_b.id)
        # Most recent log has 0 correct — scores dict should be present but empty.
        self.assertIn(lid, result)
        self.assertEqual(result[lid], {})

    def test_multi_lo_item_credits_all_mapped_los(self):
        """A correct answer on an item mapping to multiple LOs credits each LO."""
        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[ITEM_A4],  # maps to [LO1_ID, LO2_ID]
            items_incorrect=[],
        )
        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            MULTI_LO_ASSESSMENT_OBJECTIVES,
        )["pre"]
        lid = str(self.learner_a.id)
        self.assertIn(lid, result)
        # ITEM_A4 maps to both LO1 and LO2 — both should get credit
        self.assertEqual(result[lid].get(LO1_ID, 0), 1)
        self.assertEqual(result[lid].get(LO2_ID, 0), 1)

    def test_incorrect_multi_lo_item_credits_no_lo(self):
        """An incorrect answer on a multi-LO item credits none of the mapped LOs."""
        _create_attempt(
            self.learner_a,
            self.course_session_id,
            self.unit_id,
            "pre",
            items_correct=[],
            items_incorrect=[ITEM_A4],  # maps to [LO1_ID, LO2_ID], but wrong
        )
        result = compute_all_test_scores(
            [self.learner_a.id],
            self.course_session_id,
            self.unit_id,
            MULTI_LO_ASSESSMENT_OBJECTIVES,
        )["pre"]
        lid = str(self.learner_a.id)
        self.assertIn(lid, result)
        # Wrong answer — neither LO should get credit
        self.assertEqual(result[lid].get(LO1_ID, 0), 0)
        self.assertEqual(result[lid].get(LO2_ID, 0), 0)


# ---------------------------------------------------------------------------
# API integration tests
# ---------------------------------------------------------------------------


class UnitReportAPIBase(APITestCase):
    """Shared setup for API-level tests."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.classroom = Classroom.objects.create(name="classroom", parent=cls.facility)

        cls.facility_admin = helpers.create_facility_admin(
            "fadmin", DUMMY_PASSWORD, cls.facility
        )
        cls.facility_coach = helpers.create_coach(
            "fcoach", DUMMY_PASSWORD, cls.facility, is_facility_coach=True
        )
        cls.classroom_coach = helpers.create_coach(
            "ccoach", DUMMY_PASSWORD, cls.facility, classroom=cls.classroom
        )
        cls.other_classroom = Classroom.objects.create(
            name="other", parent=cls.facility
        )
        cls.other_coach = helpers.create_coach(
            "ocoach", DUMMY_PASSWORD, cls.facility, classroom=cls.other_classroom
        )
        cls.learner1 = helpers.create_learner(
            "l1", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.learner2 = helpers.create_learner(
            "l2", DUMMY_PASSWORD, cls.facility, cls.classroom
        )
        cls.learner3 = helpers.create_learner(
            "l3", DUMMY_PASSWORD, cls.facility, cls.classroom
        )

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
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)

    def test_nonexistent_course_session_returns_404(self):
        url = _make_url("0" * 32, self.unit_node.id)
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_unit_returns_404(self):
        url = _make_url(self.course_session.id, uuid.uuid4().hex)
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)


class UnitReportResponseShapeTests(UnitReportAPIBase):
    """Verify the response structure matches the spec."""

    def setUp(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )

    def test_top_level_keys(self):
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIn("unit_title", data)
        self.assertIn("learning_objectives", data)
        self.assertIn("learners", data)
        self.assertIn("pre_test", data)
        self.assertIn("post_test", data)

    def test_unit_title(self):
        response = self.client.get(self._get_url())
        self.assertEqual(response.data["unit_title"], "Unit 1: Fractions")

    def test_learning_objectives_shape(self):
        response = self.client.get(self._get_url())
        los = response.data["learning_objectives"]
        self.assertEqual(len(los), 2)
        lo = los[0]
        self.assertIn("id", lo)
        self.assertIn("text", lo)
        self.assertIn("num_questions", lo)

    def test_num_questions_counts_version_a_items(self):
        """num_questions should equal the number of version-A items per LO."""
        response = self.client.get(self._get_url())
        lo_map = {lo["id"]: lo for lo in response.data["learning_objectives"]}
        # LO1 has 2 version-A items; LO2 has 1
        self.assertEqual(lo_map[LO1_ID]["num_questions"], 2)
        self.assertEqual(lo_map[LO2_ID]["num_questions"], 1)

    def test_learner_shape(self):
        response = self.client.get(self._get_url())
        learners = response.data["learners"]
        self.assertGreater(len(learners), 0)
        learner = learners[0]
        self.assertIn("id", learner)
        self.assertIn("username", learner)
        self.assertIn("name", learner)

    def test_all_assigned_learners_present(self):
        response = self.client.get(self._get_url())
        learner_ids = {lr["id"] for lr in response.data["learners"]}
        self.assertIn(str(self.learner1.id), learner_ids)
        self.assertIn(str(self.learner2.id), learner_ids)
        self.assertIn(str(self.learner3.id), learner_ids)

    def test_test_status_keys(self):
        response = self.client.get(self._get_url())
        for key in ("pre_test", "post_test"):
            self.assertIn("status", response.data[key])
            self.assertIn("scores", response.data[key])

    def test_not_activated_status_when_no_assignments(self):
        """No UnitTestAssignment records → both tests are not_activated."""
        response = self.client.get(self._get_url())
        self.assertEqual(response.data["pre_test"]["status"], TEST_STATUS_NOT_ACTIVATED)
        self.assertEqual(
            response.data["post_test"]["status"], TEST_STATUS_NOT_ACTIVATED
        )

    def test_open_status_when_assignment_is_active(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type="pre",
            closed=False,
            activated_by=self.facility_coach,
        )
        response = self.client.get(self._get_url())
        self.assertEqual(response.data["pre_test"]["status"], TEST_STATUS_OPEN)
        self.assertEqual(
            response.data["post_test"]["status"], TEST_STATUS_NOT_ACTIVATED
        )

    def test_closed_status_when_assignment_is_ended(self):
        UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit_node.id,
            collection=self.classroom,
            test_type="pre",
            closed=True,
            activated_by=self.facility_coach,
        )
        response = self.client.get(self._get_url())
        self.assertEqual(response.data["pre_test"]["status"], TEST_STATUS_CLOSED)

    def test_unit_with_null_options_returns_valid_response(self):
        """ContentNode.options = None is handled gracefully by the 'or {}' guard."""
        bare_unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            title="Bare Unit",
            kind=content_kinds.EXERCISE,
            modality=modalities.UNIT,
            options=None,
            available=True,
        )
        url = _make_url(self.course_session.id, bare_unit.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["learning_objectives"], [])
        self.assertEqual(response.data["pre_test"]["scores"], {})
        self.assertEqual(response.data["post_test"]["scores"], {})


class UnitReportScoringTests(UnitReportAPIBase):
    """Verify per-LO score aggregation and learner sorting."""

    def setUp(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )

    def _create_multi_lo_unit(self):
        """Create a unit ContentNode with multi-LO assessment objectives."""
        return ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            title="Multi-LO Unit",
            kind=content_kinds.EXERCISE,
            modality=modalities.UNIT,
            options=MULTI_LO_UNIT_OPTIONS,
            available=True,
            parent=self.course_node,
        )

    def test_unattempted_learner_absent_from_scores_map(self):
        """Learner with no attempt is in learners list but not in scores."""
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)
        learner_ids = {lr["id"] for lr in response.data["learners"]}
        self.assertIn(str(self.learner1.id), learner_ids)
        self.assertNotIn(str(self.learner1.id), response.data["pre_test"]["scores"])
        self.assertNotIn(str(self.learner1.id), response.data["post_test"]["scores"])

    def test_per_lo_correct_count_in_scores(self):
        """Correct answers are tallied per LO for both pre and post tests."""
        _create_attempt(
            self.learner2,
            self.course_session.id,
            self.unit_node.id,
            "pre",
            items_correct=[ITEM_A1, ITEM_A2],  # both LO1 items correct
            items_incorrect=[ITEM_A3],  # LO2 item incorrect
        )

        response = self.client.get(self._get_url())
        lid = str(self.learner2.id)
        pre_scores = response.data["pre_test"]["scores"]
        self.assertIn(lid, pre_scores)
        lo_scores = pre_scores[lid]
        self.assertEqual(lo_scores.get(LO1_ID, 0), 2)
        self.assertEqual(lo_scores.get(LO2_ID, 0), 0)

    def test_both_tests_in_single_response(self):
        """A learner who attempted both tests has scores in both sections."""
        _create_attempt(
            self.learner3,
            self.course_session.id,
            self.unit_node.id,
            "pre",
            items_correct=[ITEM_A1],
        )
        _create_attempt(
            self.learner3,
            self.course_session.id,
            self.unit_node.id,
            "post",
            items_correct=[ITEM_A1, ITEM_A2],
        )

        response = self.client.get(self._get_url())
        lid = str(self.learner3.id)
        self.assertIn(lid, response.data["pre_test"]["scores"])
        self.assertIn(lid, response.data["post_test"]["scores"])

    def test_learners_sorted_ascending_by_total_score(self):
        """Learner with lowest combined score appears first."""
        course_session_id = self.course_session.id
        unit_id = self.unit_node.id

        # Assign scores 0, 1, 2 correct to learner1, learner2, learner3 respectively.
        # The loop index i is the number of correct answers for that learner.
        all_items = [ITEM_A1, ITEM_A2, ITEM_A3]
        learners = [self.learner1, self.learner2, self.learner3]
        for i, learner in enumerate(learners):
            _create_attempt(
                learner,
                course_session_id,
                unit_id,
                "pre",
                items_correct=all_items[:i],
                items_incorrect=all_items[i:],
            )

        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, 200)
        actual_order = [lr["id"] for lr in response.data["learners"]]

        # learner1 scored 0, learner2 scored 1, learner3 scored 2.
        # Ascending sort means learner1 < learner2 < learner3 in position.
        # Tie-breaking: Python's sorted() is stable, so equal-score learners
        # preserve the DB query order (which is undefined).  This test uses
        # strictly different scores so no tie-breaking is exercised.
        pos1 = actual_order.index(str(self.learner1.id))
        pos2 = actual_order.index(str(self.learner2.id))
        pos3 = actual_order.index(str(self.learner3.id))
        self.assertLess(pos1, pos2)
        self.assertLess(pos2, pos3)

    def test_num_questions_counts_multi_lo_items_for_each_lo(self):
        """An item mapping to multiple LOs increments num_questions for each mapped LO."""
        multi_lo_unit = self._create_multi_lo_unit()
        url = _make_url(self.course_session.id, multi_lo_unit.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        lo_map = {lo["id"]: lo for lo in response.data["learning_objectives"]}
        # Version A items: ITEM_A1→LO1, ITEM_A2→LO1, ITEM_A3→LO2, ITEM_A4→[LO1, LO2]
        # LO1: ITEM_A1 + ITEM_A2 + ITEM_A4 = 3
        # LO2: ITEM_A3 + ITEM_A4 = 2
        self.assertEqual(lo_map[LO1_ID]["num_questions"], 3)
        self.assertEqual(lo_map[LO2_ID]["num_questions"], 2)

    def test_multi_lo_scores_via_api(self):
        """Correct answer on a multi-LO item credits all LOs in the API response."""
        multi_lo_unit = self._create_multi_lo_unit()
        _create_attempt(
            self.learner1,
            self.course_session.id,
            multi_lo_unit.id,
            "pre",
            items_correct=[ITEM_A4],  # maps to [LO1_ID, LO2_ID]
            items_incorrect=[],
        )
        url = _make_url(self.course_session.id, multi_lo_unit.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        lid = str(self.learner1.id)
        pre_scores = response.data["pre_test"]["scores"]
        self.assertIn(lid, pre_scores)
        # ITEM_A4 maps to both LO1 and LO2 — both should get credit
        self.assertEqual(pre_scores[lid].get(LO1_ID, 0), 1)
        self.assertEqual(pre_scores[lid].get(LO2_ID, 0), 1)


class UnitReportLearnerGroupTests(UnitReportAPIBase):
    """
    Verify that learners assigned via a LearnerGroup (sub-collection) are
    resolved correctly and appear in the response.
    """

    def setUp(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )

    def test_learner_group_members_included(self):
        """
        A CourseSessionAssignment targeting a LearnerGroup should surface all
        members of that group in the learners list.
        """
        # Create a LearnerGroup inside the existing classroom and add a new learner.
        group = LearnerGroup.objects.create(name="Group A", parent=self.classroom)
        # Kolibri requires classroom membership before LearnerGroup membership.
        group_learner = helpers.create_learner(
            "gl1",
            DUMMY_PASSWORD,
            self.facility,
            classroom=self.classroom,
            learner_group=group,
        )

        # Assign the group (not the whole classroom) to a new course session.
        group_session = CourseSession.objects.create(
            course=self.course_node.id,
            title="Group Session",
            collection=self.classroom,
            created_by=self.facility_admin,
            is_active=True,
        )
        CourseSessionAssignment.objects.create(
            course_session=group_session,
            collection=group,
            assigned_by=self.facility_admin,
        )

        url = _make_url(group_session.id, self.unit_node.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        learner_ids = {lr["id"] for lr in response.data["learners"]}
        self.assertIn(str(group_learner.id), learner_ids)
        # Learners from the classroom-level assignment are NOT in this session.
        self.assertNotIn(str(self.learner1.id), learner_ids)
