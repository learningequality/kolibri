from collections import defaultdict

from django.db.models import F
from django.shortcuts import get_object_or_404
from le_utils.constants import modalities
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id

# Conservative upper bound for SQL IN-clause list lengths.  SQLite's default
# SQLITE_MAX_VARIABLE_NUMBER is 999; staying under 900 leaves headroom for
# other bind parameters in the same query (e.g. _fetch_mastery_logs uses 900
# user IDs + 2 content_ids = 902 bind vars per chunk).
_IN_CHUNK_SIZE = 900


def _chunked(lst, size):
    """Yield successive sublists of at most *size* items."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# Status strings returned by get_test_status and surfaced in the API response.
# Exported as constants so callers can import them instead of duplicating literals.
TEST_STATUS_NOT_ACTIVATED = "not_activated"
TEST_STATUS_OPEN = "open"
TEST_STATUS_CLOSED = "closed"


def get_test_status(assignments_qs):
    """
    Derive a display status from a UnitTestAssignment queryset.

    UnitTestAssignment has a single ``closed: BooleanField``.  The possible
    return values are:

      - "not_activated": no assignment exists yet
      - "open":          at least one assignment has closed=False (still active)
      - "closed":        assignments exist and all have closed=True
    """
    if not assignments_qs.exists():
        return TEST_STATUS_NOT_ACTIVATED
    if assignments_qs.filter(closed=False).exists():
        return TEST_STATUS_OPEN
    return TEST_STATUS_CLOSED


def _fetch_mastery_logs(learner_ids, pre_cid, post_cid):
    """
    Find the most recent complete MasteryLog per (learner, test_type) for the
    given synthetic content_ids.  Ordered by end_timestamp descending so the
    first occurrence of each (learner, content_id) key in the Python loop is
    always the most recent.  Chunked on learner_ids to stay within SQLite's
    variable limit.

    Returns (mastery_log_ids, mastery_log_to_meta) where mastery_log_to_meta
    maps mastery log id → {learner_id, test_type}.
    """
    cid_to_test_type = {pre_cid: "pre", post_cid: "post"}
    mastery_log_ids = []
    mastery_log_to_meta = {}
    seen = set()

    # Each learner appears in exactly one chunk, so order_by within the chunk
    # picks the most recent log per (learner, content_id).
    for chunk in _chunked(list(learner_ids), _IN_CHUNK_SIZE):
        for ml in (
            MasteryLog.objects.filter(
                summarylog__content_id__in=[pre_cid, post_cid],
                summarylog__user_id__in=chunk,
                complete=True,
                # end_timestamp is set when the mastery log is submitted; an
                # isnull guard excludes in-progress logs that have complete=True
                # but no recorded end time.
                end_timestamp__isnull=False,
            )
            .order_by("-end_timestamp")
            .values("id", "summarylog__content_id", "summarylog__user_id")
        ):
            key = (ml["summarylog__user_id"], ml["summarylog__content_id"])
            if key not in seen:
                seen.add(key)
                mastery_log_ids.append(ml["id"])
                mastery_log_to_meta[ml["id"]] = {
                    "learner_id": ml["summarylog__user_id"],
                    "test_type": cid_to_test_type[ml["summarylog__content_id"]],
                }

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
        if log["correct"] != 1.0:  # only fully-correct; partial credit excluded
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
    Compute per-learner, per-LO correct counts for both pre and post tests.

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

    pre_cid = get_synthetic_content_id(
        str(course_session_id), str(unit_contentnode_id), "pre"
    )
    post_cid = get_synthetic_content_id(
        str(course_session_id), str(unit_contentnode_id), "post"
    )

    mastery_log_ids, mastery_log_to_meta = _fetch_mastery_logs(
        learner_ids, pre_cid, post_cid
    )

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
    """

    def has_permission(self, request, view):
        # Guard first: AnonymousUser has no has_role_for method.
        if not request.user.is_authenticated:
            return False
        course_session_id = view.kwargs.get("course_session_id")
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            course_session = CourseSession.objects.get(pk=course_session_id)
            # Cache on the view so retrieve() can reuse it without a second DB hit.
            view._course_session = course_session
            return request.user.has_role_for(allowed_roles, course_session.collection)
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

    # UnitReportPermissions rejects unauthenticated requests as its first guard,
    # so IsAuthenticated is not listed separately.
    permission_classes = (UnitReportPermissions,)

    def retrieve(self, request, **kwargs):
        course_session_id = self.kwargs["course_session_id"]
        unit_contentnode_id = self.kwargs["unit_contentnode_id"]

        # _course_session is set by UnitReportPermissions.has_permission()
        # before this method is called.
        assert hasattr(self, "_course_session"), (
            "_course_session must be set by UnitReportPermissions.has_permission() "
            "before retrieve() is called"
        )
        course_session = self._course_session
        unit = get_object_or_404(
            ContentNode, pk=unit_contentnode_id, modality=modalities.UNIT
        )

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

        # Determine assigned learners via the course session's assignments.
        assignment_collection_ids = list(
            course_session.assignments.values_list("collection_id", flat=True)
        )
        # Exclude users who hold a coach or admin role in the assigned
        # collections so that a dual-role user (enrolled as a member AND
        # holding a coach role) does not appear in the learner list.
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

        # Determine test state from the course session's unit test assignments.
        unit_test_qs = course_session.unit_test_assignments.filter(
            unit_contentnode_id=unit_contentnode_id,
        )
        pre_status = get_test_status(unit_test_qs.filter(test_type="pre"))
        post_status = get_test_status(unit_test_qs.filter(test_type="post"))

        # Compute scores for both tests in a single DB pass.
        all_scores = compute_all_test_scores(
            learner_ids, course_session_id, unit_contentnode_id, assessment_objectives
        )
        pre_scores = all_scores["pre"]
        post_scores = all_scores["post"]

        # Sort learners ascending by total score (pre + post combined), so that
        # learners who need the most help appear first.  Tie-break on id for
        # a deterministic, stable ordering.
        def _sort_key(learner):
            lid = str(learner["id"])
            total = sum(pre_scores.get(lid, {}).values()) + sum(
                post_scores.get(lid, {}).values()
            )
            return (total, lid)

        learners_sorted = sorted(learners, key=_sort_key)

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
