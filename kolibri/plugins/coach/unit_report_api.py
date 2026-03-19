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

# Status strings returned by get_test_status and surfaced in the API response.
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


def get_synthetic_content_id(
    learner_id, course_session_id, unit_contentnode_id, test_type
):
    """
    Generate a deterministic UUID5 content_id for MasteryLog/AttemptLog tracking.
    Must match the generation logic used on the learner side (issue #14133).
    """
    key = "{}:{}:{}:{}".format(
        learner_id, course_session_id, unit_contentnode_id, test_type
    )
    return uuid.uuid5(_SYNTHETIC_CONTENT_ID_NAMESPACE, key).hex


def get_test_status(assignments):
    """
    Derive a display status from a list of UnitTestAssignment objects.

    UnitTestAssignment has a single ``closed: BooleanField``.  The possible
    return values are:

      - "not_activated": no assignment exists yet
      - "open":          at least one assignment has closed=False (still active)
      - "closed":        assignments exist and all have closed=True
    """
    if not assignments:
        return TEST_STATUS_NOT_ACTIVATED
    if any(not a.closed for a in assignments):
        return TEST_STATUS_OPEN
    return TEST_STATUS_CLOSED


def _fetch_mastery_logs(content_id_to_meta):
    """
    *content_id_to_meta* is a dict mapping synthetic content_id → meta dict.
    For each key, find the most recent complete MasteryLog via a correlated DB
    subquery (max end_timestamp per content_id).  Chunked to stay within
    SQLite's variable limit.

    Returns (mastery_log_ids, mastery_log_to_meta) where mastery_log_to_meta
    maps mastery log id → {learner_id, test_type}.
    """
    # Correlated subquery: picks the latest completed MasteryLog per
    # summarylog content_id, avoiding a race with Python-side sort dedup.
    # The seen_content_ids guard handles the rare identical-timestamp tie.
    latest_ts_subquery = (
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

    for chunk in _chunked(list(content_id_to_meta.keys()), _IN_CHUNK_SIZE):
        for ml in MasteryLog.objects.filter(
            summarylog__content_id__in=chunk,
            complete=True,
            end_timestamp__isnull=False,
            end_timestamp=Subquery(latest_ts_subquery),
        ).values("id", "summarylog__content_id"):
            cid = ml["summarylog__content_id"]
            if cid not in seen_content_ids:
                seen_content_ids.add(cid)
                mastery_log_ids.append(ml["id"])
                mastery_log_to_meta[ml["id"]] = content_id_to_meta[cid]

    return mastery_log_ids, mastery_log_to_meta


def _fetch_deduplicated_attempts(mastery_log_ids):
    """
    Fetch AttemptLogs for the given mastery log ids and deduplicate per
    (masterylog_id, item) by keeping the attempt with the latest end_timestamp.
    Done in Python rather than via ORDER BY to avoid sensitivity to DB ordering
    behaviour (ties/NULLs).  Chunked to stay within SQLite's variable limit.

    Returns {(masterylog_id, item): log_dict}.
    """
    item_latest = {}
    for chunk in _chunked(mastery_log_ids, _IN_CHUNK_SIZE):
        for log in AttemptLog.objects.filter(masterylog_id__in=chunk).values(
            "masterylog_id", "item", "correct", "end_timestamp"
        ):
            key = (log["masterylog_id"], log["item"])
            existing = item_latest.get(key)
            if existing is None or log["end_timestamp"] > existing["end_timestamp"]:
                item_latest[key] = log
    return item_latest


def _accumulate_scores(
    results, item_latest, mastery_log_to_meta, assessment_objectives
):
    """
    Accumulate correct counts per learner per LO per test type into *results*.

    Only fully-correct attempts (correct == 1.0) contribute; partial credit
    (0 < correct < 1) is intentionally excluded.
    """
    for (ml_id, item), log in item_latest.items():
        if log["correct"] != 1:  # only fully-correct (1.0); partial credit excluded
            continue
        meta = mastery_log_to_meta.get(ml_id)
        if meta is None:
            continue
        lo_id = assessment_objectives.get(item)
        if lo_id is None:
            continue
        lo_scores = results[meta["test_type"]].setdefault(str(meta["learner_id"]), {})
        lo_id_str = str(lo_id)
        lo_scores[lo_id_str] = lo_scores.get(lo_id_str, 0) + 1


def compute_all_test_scores(
    learner_ids, course_session_id, unit_contentnode_id, assessment_objectives
):
    """
    Compute per-learner, per-LO correct counts for both pre and post tests in a
    single pair of DB queries.

    For each learner × test_type, generates a synthetic content_id and looks up
    the most recent complete MasteryLog with that content_id.  AttemptLogs are
    mapped to learning objectives via assessment_objectives; when the same item
    appears more than once in a mastery log, the most recent attempt wins.

    Returns:
        {
            "pre":  { learner_id_str: { lo_id_str: correct_count }, ... },
            "post": { learner_id_str: { lo_id_str: correct_count }, ... },
        }

    A learner who completed the test is always present in the inner dict (even
    if every answer was wrong).  A learner who never started, or whose
    MasteryLog is still in-progress (complete=False), is absent.
    """
    if not learner_ids:
        return {"pre": {}, "post": {}}

    # Build synthetic content_id → (learner_id, test_type) for both test types.
    content_id_to_meta = {}
    for learner_id in learner_ids:
        for test_type in ("pre", "post"):
            synthetic_cid = get_synthetic_content_id(
                str(learner_id),
                str(course_session_id),
                str(unit_contentnode_id),
                test_type,
            )
            content_id_to_meta[synthetic_cid] = {
                "learner_id": learner_id,
                "test_type": test_type,
            }

    mastery_log_ids, mastery_log_to_meta = _fetch_mastery_logs(content_id_to_meta)

    results = {"pre": {}, "post": {}}
    if not mastery_log_ids:
        return results

    # Initialise every learner that has a complete mastery log so they appear
    # even if they answered every question incorrectly.
    for meta in mastery_log_to_meta.values():
        results[meta["test_type"]].setdefault(str(meta["learner_id"]), {})

    item_latest = _fetch_deduplicated_attempts(mastery_log_ids)
    _accumulate_scores(results, item_latest, mastery_log_to_meta, assessment_objectives)

    return results


class UnitReportPermissions(permissions.BasePermission):
    """
    Allow access only to admins and coaches for the classroom associated
    with the given course session.

    Side effect: on success, caches the validated ``CourseSession`` instance
    on the view as ``view._course_session`` so that ``UnitReportViewSet.retrieve``
    can reuse it without a second DB round-trip.
    """

    def has_permission(self, request, view):
        # Guard first: AnonymousUser has no has_role_for method.
        if not request.user.is_authenticated:
            return False
        course_session_id = view.kwargs.get("course_session_id")
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            course_session = CourseSession.objects.get(pk=course_session_id)
            if request.user.has_role_for(allowed_roles, course_session.collection):
                # Cache so the view can reuse it without a second DB query.
                view._course_session = course_session
                return True
            return False
        except (CourseSession.DoesNotExist, ValueError):
            return False


class UnitReportViewSet(viewsets.ViewSet):
    """
    Returns aggregated learner performance data for a unit's pre/post tests,
    broken down by learning objective.

    GET /api/coach/coursesession/{course_session_id}/unit/{unit_contentnode_id}/report/

    Note: Uses ``viewsets.ViewSet`` rather than ``ReadOnlyValuesViewset`` because
    the response is a deeply nested structure (per-learner scores keyed by LO id)
    that cannot be expressed as a flat ``values`` tuple.  The single ``retrieve``
    action makes this a read-only endpoint in practice.
    """

    permission_classes = (permissions.IsAuthenticated, UnitReportPermissions)

    def retrieve(self, request, **kwargs):
        course_session_id = self.kwargs["course_session_id"]
        unit_contentnode_id = self.kwargs["unit_contentnode_id"]

        # Reuse the CourseSession already fetched and validated by
        # UnitReportPermissions to avoid a redundant DB query.
        course_session = getattr(self, "_course_session", None) or get_object_or_404(
            CourseSession, pk=course_session_id
        )
        unit = get_object_or_404(ContentNode, pk=unit_contentnode_id)

        options = unit.options or {}

        # Learning objectives list: [{id, text, metadata?}, ...]
        raw_los = options.get("learning_objectives") or []

        # Maps assessment item IDs → LO IDs.  Guard against null in the DB.
        assessment_objectives = options.get("assessment_objectives") or {}

        # Mastery criteria / A-B item lists (schema-mastery_criteria.json)
        pre_post_test_config = (
            (options.get("completion_criteria") or {}).get("threshold") or {}
        ).get("pre_post_test") or {}
        version_a_item_ids = pre_post_test_config.get("version_a_item_ids") or []

        # num_questions per LO: count of version A items that map to each LO.
        # Version A is used as the canonical reference; both versions are expected
        # to cover the same LOs with the same number of questions.
        lo_question_count = defaultdict(int)
        version_a_set = set(version_a_item_ids)
        for item_id, lo_id in assessment_objectives.items():
            if lo_id is None:
                continue  # skip malformed entries: str(None) would silently produce "None"
            if item_id in version_a_set:
                lo_question_count[str(lo_id)] += 1

        learning_objectives = [
            {
                "id": lo["id"],
                "text": lo["text"],
                "num_questions": lo_question_count.get(str(lo["id"]), 0),
            }
            for lo in raw_los
        ]

        # Determine assigned learners via CourseSessionAssignment (canonical source).
        assignment_collection_ids = list(
            CourseSessionAssignment.objects.filter(
                course_session=course_session
            ).values_list("collection_id", flat=True)
        )
        # Exclude users who hold a coach or admin role in the assigned
        # collections so that a dual-role user (enrolled as a member AND
        # holding a coach role) does not appear in the learner list.
        # Note: this exclusion is scoped to the assignment collections only.
        # A facility-level admin who is not a member of any assignment collection
        # will not appear here (correct); one who IS a member would be excluded
        # by the coach_admin_ids filter below (also correct).
        coach_admin_ids = Role.objects.filter(
            collection_id__in=assignment_collection_ids,
            kind__in=[role_kinds.COACH, role_kinds.ADMIN, role_kinds.ASSIGNABLE_COACH],
        ).values_list("user_id", flat=True)
        learners = list(
            FacilityUser.objects.filter(
                memberships__collection_id__in=assignment_collection_ids
            )
            .exclude(id__in=coach_admin_ids)
            .distinct()
            .values("id", "username", name=F("full_name"))
        )
        learner_ids = [lr["id"] for lr in learners]

        # Determine test state from UnitTestAssignment records.
        all_assignments = list(
            UnitTestAssignment.objects.filter(
                course_session=course_session,
                unit_contentnode_id=unit_contentnode_id,
            )
        )
        pre_assignments = [a for a in all_assignments if a.test_type == "pre"]
        post_assignments = [a for a in all_assignments if a.test_type == "post"]

        pre_status = get_test_status(pre_assignments)
        post_status = get_test_status(post_assignments)

        # Compute scores for both tests in a single DB pass.
        all_scores = compute_all_test_scores(
            learner_ids, course_session_id, unit_contentnode_id, assessment_objectives
        )
        pre_scores = all_scores["pre"]
        post_scores = all_scores["post"]

        # Sort learners ascending by total score (pre + post combined), so that
        # learners who need the most help appear first.
        def _total_score(learner):
            lid = str(learner["id"])
            return sum(pre_scores.get(lid, {}).values()) + sum(
                post_scores.get(lid, {}).values()
            )

        learners_sorted = sorted(learners, key=_total_score)

        # Ensure learner IDs are plain strings in the output.
        for learner in learners_sorted:
            learner["id"] = str(learner["id"])

        return Response(
            {
                "unit_title": unit.title,
                "learning_objectives": learning_objectives,
                "learners": learners_sorted,
                "pre_test": {
                    "status": pre_status,
                    "scores": pre_scores,
                },
                "post_test": {
                    "status": post_status,
                    "scores": post_scores,
                },
            }
        )
