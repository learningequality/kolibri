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


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

# Fixed UUIDs so test failures are reproducible across runs.
LO1_ID = "00000000000000000000000000000011"
LO2_ID = "00000000000000000000000000000022"

# Version A items: 2 for LO1, 1 for LO2
ITEM_A1 = "0000000000000000000000000000a001"
ITEM_A2 = "0000000000000000000000000000a002"
ITEM_A3 = "0000000000000000000000000000a003"  # maps to LO2

# Version B items: 2 for LO1, 1 for LO2
ITEM_B1 = "0000000000000000000000000000b001"
ITEM_B2 = "0000000000000000000000000000b002"
ITEM_B3 = "0000000000000000000000000000b003"  # maps to LO2

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


# ---------------------------------------------------------------------------
# Unit tests: pure logic (no HTTP)
# ---------------------------------------------------------------------------


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
