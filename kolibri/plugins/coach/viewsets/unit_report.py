from collections import defaultdict

from django.db.models import F
from django.shortcuts import get_object_or_404
from le_utils.constants import modalities
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from kolibri.core import error_constants
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.utils.delete import chunk as _chunked
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import TestType
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id

_TEST_TYPES = (TestType.Pre, TestType.Post)

# Mastery log ids grow as learners x units x test types — too many to inline
# under SQLITE_MAX_SQL_LENGTH, so that IN list stays bound and is chunked.
_IN_CHUNK_SIZE = 900


# Status strings returned by _derive_test_status and surfaced in the API response.
# Exported as constants so callers can import them instead of duplicating literals.
TEST_STATUS_NOT_ACTIVATED = "not_activated"
TEST_STATUS_OPEN = "open"
TEST_STATUS_CLOSED = "closed"


def _derive_test_status(closed_flags):
    """
    Derive a display status from the ``closed`` flags of a unit's test
    assignments.

    UnitTestAssignment has a single ``closed: BooleanField``.  The possible
    return values are:

      - "not_activated": no assignment exists yet
      - "open":          at least one assignment has closed=False (still active)
      - "closed":        assignments exist and all have closed=True
    """
    if not closed_flags:
        return TEST_STATUS_NOT_ACTIVATED
    if not all(closed_flags):
        return TEST_STATUS_OPEN
    return TEST_STATUS_CLOSED


def _fetch_test_statuses(course_session, unit_ids):
    """
    Map each requested unit id to {"pre": status, "post": status}, including
    ids that have no assignments.
    """
    closed_flags = defaultdict(list)
    for assignment in course_session.unit_test_assignments.filter(
        unit_contentnode_id__inline_in=unit_ids
    ).values("unit_contentnode_id", "test_type", "closed"):
        key = (assignment["unit_contentnode_id"], assignment["test_type"])
        closed_flags[key].append(assignment["closed"])

    return {
        unit_id: {
            test_type: _derive_test_status(closed_flags[(unit_id, test_type)])
            for test_type in _TEST_TYPES
        }
        for unit_id in unit_ids
    }


def _fetch_mastery_logs(learner_ids, content_id_map):
    """
    Find the most recent complete MasteryLog per (learner, synthetic content_id)
    for the given content ids.  Ordered by end_timestamp descending so the first
    occurrence of each (learner, content_id) key in the Python loop is always the
    most recent.

    content_id_map maps synthetic content_id → (unit_id, test_type).

    Returns {mastery log id: {learner_id, unit_id, test_type}}.
    """
    mastery_log_to_meta = {}
    seen = set()

    for ml in (
        MasteryLog.objects.filter(
            # Inlined because two bound IN lists in one statement would share
            # SQLite's 999-variable budget.
            summarylog__content_id__inline_in=list(content_id_map),
            summarylog__user_id__inline_in=learner_ids,
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
            unit_id, test_type = content_id_map[ml["summarylog__content_id"]]
            mastery_log_to_meta[ml["id"]] = {
                "learner_id": ml["summarylog__user_id"],
                "unit_id": unit_id,
                "test_type": test_type,
            }

    return mastery_log_to_meta


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
    results, item_latest, mastery_log_to_meta, assessment_objectives_by_unit
):
    """
    Accumulate correct counts per unit per learner per LO per test type into
    *results*.

    Only fully-correct attempts (correct == 1.0) contribute; partial credit
    (0 < correct < 1) is intentionally excluded.
    """
    for (ml_id, item), log in item_latest.items():
        if log["correct"] != 1.0:  # only fully-correct; partial credit excluded
            continue
        meta = mastery_log_to_meta.get(ml_id)
        if meta is None:
            continue
        lo_ids = assessment_objectives_by_unit.get(meta["unit_id"], {}).get(item)
        if not lo_ids:
            continue
        lo_scores = results[meta["unit_id"]][meta["test_type"]].setdefault(
            str(meta["learner_id"]), {}
        )
        for lo_id in lo_ids:
            lo_id_str = str(lo_id)
            lo_scores[lo_id_str] = lo_scores.get(lo_id_str, 0) + 1


def compute_all_test_scores(
    learner_ids, course_session_id, assessment_objectives_by_unit
):
    """
    Compute per-learner, per-LO correct counts for both tests of every unit.

    For each learner x unit x test_type, generates a synthetic content_id and
    looks up the most recent complete MasteryLog with that content_id.
    assessment_objectives_by_unit maps each requested unit id to its item →
    LO map, and so also names the units to score.  When the same item appears
    more than once in a mastery log, the most recent attempt wins.

    Returns:
        {
            unit_id_str: {
                "pre":  { learner_id_str: { lo_id_str: correct_count }, ... },
                "post": { learner_id_str: { lo_id_str: correct_count }, ... },
            },
            ...
        }

    Every requested unit id is present.  A learner who completed the test is
    always present in the inner dict (even if every answer was wrong).  A
    learner who never started, or whose MasteryLog is still in-progress
    (complete=False), is absent.
    """
    results = {
        unit_id: {test_type: {} for test_type in _TEST_TYPES}
        for unit_id in assessment_objectives_by_unit
    }
    if not learner_ids:
        return results

    content_id_map = {
        get_synthetic_content_id(str(course_session_id), unit_id, test_type): (
            unit_id,
            test_type,
        )
        for unit_id in assessment_objectives_by_unit
        for test_type in _TEST_TYPES
    }

    mastery_log_to_meta = _fetch_mastery_logs(learner_ids, content_id_map)
    if not mastery_log_to_meta:
        return results

    # Initialise every learner that has a complete mastery log so they appear
    # even if they answered every question incorrectly.
    for meta in mastery_log_to_meta.values():
        results[meta["unit_id"]][meta["test_type"]].setdefault(
            str(meta["learner_id"]), {}
        )

    item_latest = _fetch_deduplicated_attempts(list(mastery_log_to_meta))
    _accumulate_scores(
        results, item_latest, mastery_log_to_meta, assessment_objectives_by_unit
    )

    return results


def _learning_objectives(options):
    """
    num_questions per LO is the count of version A items that map to each LO.
    Version A is used as the canonical reference; both versions are expected to
    cover the same LOs with the same number of questions.
    """
    # Maps assessment item IDs → LO IDs.  Guard against null in the DB.
    assessment_objectives = options.get("assessment_objectives") or {}

    # Mastery criteria / A-B item lists (schema-mastery_criteria.json)
    pre_post_test_config = (
        (options.get("completion_criteria") or {}).get("threshold") or {}
    ).get("pre_post_test") or {}
    version_a_set = set(pre_post_test_config.get("version_a_item_ids") or [])

    lo_question_count = defaultdict(int)
    for item_id, lo_ids in assessment_objectives.items():
        if not lo_ids:
            continue
        if item_id in version_a_set:
            for lo_id in lo_ids:
                lo_question_count[str(lo_id)] += 1

    return [
        {
            "id": lo["id"],
            "text": lo["text"],
            "num_questions": lo_question_count.get(str(lo["id"]), 0),
        }
        for lo in (options.get("learning_objectives") or [])
    ]


class UnitReportViewSet(viewsets.ViewSet):
    """
    Returns aggregated learner performance data for the pre/post tests of a
    course session's units, broken down by learning objective.

    GET /api/coach/coursesession/{course_session_id}/unitreports/?unit_ids=<csv>

    Note: Uses ``viewsets.ViewSet`` rather than ``ReadOnlyValuesViewset`` because
    the response is a deeply nested structure (per-learner scores keyed by LO id)
    that cannot be expressed as a flat ``values`` tuple.  The single ``list``
    action makes this a read-only endpoint in practice.
    """

    permission_classes = (KolibriAuthPermissions,)

    def list(self, request, **kwargs):
        course_session_id = self.kwargs["course_session_id"]

        course_session = get_object_or_404(CourseSession, pk=course_session_id)
        self.check_object_permissions(request, course_session)

        course_units = list(
            ContentNode.objects.filter(
                parent_id=course_session.course,
                modality=modalities.UNIT,
            )
            .order_by("lft")
            .values("id", "title", "options")
        )
        for number, unit in enumerate(course_units, 1):
            unit["id"] = str(unit["id"])
            unit["unit_number"] = number
            unit["options"] = unit["options"] or {}
        selected = self._select_units(request, course_units)
        selected_ids = [unit["id"] for unit in selected]

        course_title = (
            ContentNode.objects.filter(id=course_session.course)
            .values_list("title", flat=True)
            .first()
            or ""
        )

        # Determine assigned learners via the course session's assignments.
        assignment_collection_ids = list(
            course_session.assignments.values_list("collection_id", flat=True)
        )
        learners = list(
            FacilityUser.objects.filter(
                memberships__collection_id__in=assignment_collection_ids
            )
            .distinct()
            .values("id", "username", name=F("full_name"))
        )
        for learner in learners:
            learner["id"] = str(learner["id"])
        learner_ids = [learner["id"] for learner in learners]

        statuses = _fetch_test_statuses(course_session, selected_ids)
        all_scores = compute_all_test_scores(
            learner_ids,
            course_session_id,
            {
                unit["id"]: unit["options"].get("assessment_objectives") or {}
                for unit in selected
            },
        )

        units = []
        for unit in selected:
            options = unit["options"]
            scores = all_scores[unit["id"]]
            status = statuses[unit["id"]]
            units.append(
                {
                    "unit_contentnode_id": unit["id"],
                    "unit_title": unit["title"],
                    "unit_number": unit["unit_number"],
                    "learning_objectives": _learning_objectives(options),
                    "lesson_objectives": options.get("lesson_objectives") or {},
                    "pre_test": {
                        "status": status[TestType.Pre],
                        "scores": scores[TestType.Pre],
                    },
                    "post_test": {
                        "status": status[TestType.Post],
                        "scores": scores[TestType.Post],
                    },
                }
            )

        return Response(
            {
                "course_title": course_title,
                "learners": sorted(
                    learners, key=lambda learner: (learner["name"] or "", learner["id"])
                ),
                "units": units,
            }
        )

    def _select_units(self, request, course_units):
        requested = request.query_params.get("unit_ids")
        if requested is None:
            return course_units
        requested_ids = {unit_id for unit_id in requested.split(",") if unit_id}
        unknown = requested_ids - {unit["id"] for unit in course_units}
        if unknown:
            raise ValidationError(
                "Units do not belong to this course session: {}".format(
                    ", ".join(sorted(unknown))
                ),
                code=error_constants.INVALID,
            )
        return [unit for unit in course_units if unit["id"] in requested_ids]
