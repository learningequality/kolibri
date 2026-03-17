import hashlib  # used by get_test_version (canonical A/B split definition)
import uuid
from collections import defaultdict

from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import TestStatus
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog

# Conservative upper bound for SQL IN-clause list lengths.  SQLite's default
# SQLITE_MAX_VARIABLE_NUMBER is 999; staying under 900 leaves headroom for
# other bind parameters in the same query.
_IN_CHUNK_SIZE = 900


def _chunked(lst, size):
    """Yield successive sublists of at most *size* items."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# Private namespace UUID for synthetic content_id generation (issue #14133).
# Generated once with uuid.uuid4() and pinned here.  Using a project-private
# namespace prevents collisions with IDs produced by any code that happens to
# use the same uuid5(key) pattern over one of the well-known standard namespaces
# (NAMESPACE_DNS, NAMESPACE_URL, etc.).
_SYNTHETIC_CONTENT_ID_NAMESPACE = uuid.UUID("7c9e4b1a-3d5f-4a8e-9c2b-6d0e1f2a3b4c")

# Status strings returned by _get_test_status and surfaced in the API response.
# Exported as constants so callers can import them instead of duplicating literals.
TEST_STATUS_NOT_ACTIVATED = "not_activated"
TEST_STATUS_OPEN = "open"
TEST_STATUS_CLOSED = "closed"


def get_test_version(learner_id, course_session_id, unit_contentnode_id):
    """
    Returns 'a' or 'b' based on a deterministic hash of
    (learner_id, course_session_id, unit_contentnode_id).
    Implements the A/B split logic defined in issue #14133.

    This function is the canonical definition shared by the learner-side client
    (which imports it to decide which item set to present) and by server-side
    tests.  The coach report API itself does not call it directly — instead it
    queries for both synthetic content_ids (pre and post, versions a and b) in a
    single pass — but it must live here so that both sides stay in sync.
    """
    key = "{}:{}:{}".format(learner_id, course_session_id, unit_contentnode_id)
    hash_byte = hashlib.sha256(key.encode()).digest()[0]
    return "a" if hash_byte < 128 else "b"


def get_synthetic_content_id(learner_id, course_session_id, unit_contentnode_id, test_type):
    """
    Generate a deterministic UUID5 content_id for MasteryLog/AttemptLog tracking.
    Must match the generation logic used on the learner side (issue #14133).
    """
    key = "{}:{}:{}:{}".format(
        learner_id, course_session_id, unit_contentnode_id, test_type
    )
    return uuid.uuid5(_SYNTHETIC_CONTENT_ID_NAMESPACE, key).hex


def _get_test_status(assignments):
    """
    Derive a display status from a list of UnitTestAssignment objects.

    Returns one of:
      - "not_activated": no assignment exists, or all assignments are still in
                         the not_started state (created but not yet opened)
      - "open":          at least one assignment is currently active
      - "closed":        at least one assignment has been ended (and none active)

    Checking status == TestStatus.Ended explicitly (rather than relying on
    is_active == False) avoids misclassifying a not_started assignment as
    "closed".
    """
    if not assignments:
        return TEST_STATUS_NOT_ACTIVATED
    if any(a.is_active for a in assignments):
        return TEST_STATUS_OPEN
    if any(a.status == TestStatus.Ended for a in assignments):
        return TEST_STATUS_CLOSED
    return TEST_STATUS_NOT_ACTIVATED


def _compute_all_test_scores(learner_ids, course_session_id, unit_contentnode_id, assessment_objectives):
    """
    Compute per-learner, per-LO correct counts for both pre and post tests in a
    single pair of DB queries.

    For each learner × test_type, generates a synthetic content_id and looks up
    the most recent complete MasteryLog with that content_id, selected via a
    correlated DB subquery (max end_timestamp per content_id) to avoid a race
    condition that a Python-side sort over a large result set would have.
    AttemptLogs are mapped to learning objectives via assessment_objectives;
    when the same item appears more than once in a mastery log, the most recent
    attempt (by end_timestamp) wins — resolved entirely in Python to avoid
    relying on database-level ordering guarantees.

    Only fully-correct attempts (correct == 1.0) contribute to the score.
    Partial-credit values (0 < correct < 1) are intentionally excluded; for
    pre/post quiz assessments the data model uses 0 or 1 exclusively.

    Returns:
        {
            "pre":  { learner_id_str: { lo_id_str: correct_count }, ... },
            "post": { learner_id_str: { lo_id_str: correct_count }, ... },
        }

    Absence in the returned dict has two distinct causes:
      - No MasteryLog at all: the learner has not started the test.
      - MasteryLog exists but complete=False: the learner started but has not
        finished; in-progress logs are intentionally excluded so partial
        in-flight data does not skew the coach view.
    In both cases the learner will not appear in the inner dict for that test
    type.  A learner who finished (complete=True) is always present, even when
    every answer was wrong (empty scores dict).
    """
    if not learner_ids:
        return {"pre": {}, "post": {}}

    # Build synthetic content_id → (learner_id, test_type) for both test types
    content_id_to_meta = {}
    for learner_id in learner_ids:
        for test_type in ("pre", "post"):
            synthetic_cid = get_synthetic_content_id(
                str(learner_id), str(course_session_id), str(unit_contentnode_id), test_type
            )
            content_id_to_meta[synthetic_cid] = {
                "learner_id": learner_id,
                "test_type": test_type,
            }

    # Correlated subquery: for a given MasteryLog row, return the maximum
    # end_timestamp among all complete, non-null MasteryLogs that share the
    # same summarylog content_id.  Filtering the outer query to only rows
    # where end_timestamp = Subquery(...) picks the most-recent log per
    # learner × test_type atomically in the DB, avoiding a race condition
    # that Python-side sort deduplication would be subject to.  This matters
    # because a learner can retake a test: each retake produces a new
    # MasteryLog against the same ContentSummaryLog, and only the latest
    # completed attempt should count.
    # The seen_content_ids guard handles the rare tie (identical timestamps).
    _latest_ts_subquery = (
        MasteryLog.objects.filter(
            summarylog__content_id=OuterRef("summarylog__content_id"),
            complete=True,
            end_timestamp__isnull=False,
        )
        .order_by("-end_timestamp")
        .values("end_timestamp")[:1]
    )

    mastery_log_ids = []
    mastery_log_to_meta = {}
    seen_content_ids = set()

    # Chunk the content_id IN list to stay within SQLite's variable limit.
    for chunk in _chunked(list(content_id_to_meta.keys()), _IN_CHUNK_SIZE):
        for ml in (
            MasteryLog.objects.filter(
                summarylog__content_id__in=chunk,
                complete=True,
                end_timestamp__isnull=False,
                end_timestamp=Subquery(_latest_ts_subquery),
            )
            .values("id", "summarylog__content_id")
        ):
            cid = ml["summarylog__content_id"]
            if cid not in seen_content_ids:
                seen_content_ids.add(cid)
                mastery_log_ids.append(ml["id"])
                mastery_log_to_meta[ml["id"]] = content_id_to_meta[cid]

    results = {"pre": {}, "post": {}}

    if not mastery_log_ids:
        return results

    # Initialise every learner that has a complete mastery log so they appear
    # in the results even if they answered every question incorrectly.
    for meta in mastery_log_to_meta.values():
        results[meta["test_type"]].setdefault(str(meta["learner_id"]), {})

    # Fetch all attempt logs and deduplicate per (masterylog, item) by keeping
    # the attempt with the latest end_timestamp.  Done in Python rather than
    # via ORDER BY so it is not sensitive to DB ordering behaviour (ties/NULLs).
    # The mastery_log_ids list is chunked to avoid SQLite variable-count limits.
    item_latest = {}  # (masterylog_id, item) -> log dict
    for chunk in _chunked(mastery_log_ids, _IN_CHUNK_SIZE):
        for log in AttemptLog.objects.filter(masterylog_id__in=chunk).values(
            "masterylog_id", "item", "correct", "end_timestamp"
        ):
            key = (log["masterylog_id"], log["item"])
            existing = item_latest.get(key)
            if existing is None or log["end_timestamp"] > existing["end_timestamp"]:
                item_latest[key] = log

    # Accumulate correct counts per learner per LO per test type.
    for (ml_id, item), log in item_latest.items():
        if log["correct"] != 1:  # only fully-correct (1.0); partial credit excluded
            continue
        meta = mastery_log_to_meta.get(ml_id)
        if meta is None:
            continue
        lo_id = assessment_objectives.get(item)
        if lo_id is None:
            continue
        test_type = meta["test_type"]
        learner_id_str = str(meta["learner_id"])
        lo_id_str = str(lo_id)
        lo_scores = results[test_type].setdefault(learner_id_str, {})
        lo_scores[lo_id_str] = lo_scores.get(lo_id_str, 0) + 1

    return results
