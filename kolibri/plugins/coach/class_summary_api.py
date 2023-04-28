from django.db import connections
from django.db.models import Exists
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.utils import OperationalError
from django.shortcuts import get_object_or_404
from le_utils.constants import content_kinds
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth import models as auth_models
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger import models as logger_models
from kolibri.core.logger.utils.quiz import annotate_response_summary
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.query import annotate_array_aggregate
from kolibri.core.query import SQCount
from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS


# Intended to match  NotificationEventType
NOT_STARTED = "NotStarted"
STARTED = "Started"
HELP_NEEDED = "HelpNeeded"
COMPLETED = "Completed"


def _get_quiz_status(queryset):
    queryset = queryset.filter(
        mastery_level__lt=0,
    ).order_by("-end_timestamp")
    queryset = queryset.annotate(
        previous_masterylog=Subquery(
            queryset.filter(
                summarylog=OuterRef("summarylog"),
                end_timestamp__lt=OuterRef("end_timestamp"),
            ).values_list("id")[:1]
        ),
    )
    queryset = annotate_response_summary(queryset)
    items = []
    statuses = queryset.annotate(
        last_activity=Max("attemptlogs__end_timestamp"),
        previous_num_correct=SQCount(
            logger_models.AttemptLog.objects.filter(
                masterylog=OuterRef("previous_masterylog"), correct=1
            )
            .order_by()
            .values_list("item")
            .distinct(),
            field="item",
        ),
    ).values(
        "summarylog__content_id",
        "complete",
        "last_activity",
        "num_correct",
        "num_answered",
        "previous_num_correct",
        learner_id=F("user_id"),
    )
    seen = set()
    for item in statuses:
        key = "{}-{}".format(item["learner_id"], item["summarylog__content_id"])
        if key not in seen:
            items.append(item)
            seen.add(key)
    return items


def content_status_serializer(lesson_data, learners_data, classroom):  # noqa C901

    # First generate a unique set of content node ids from all the lessons
    lesson_node_ids = set()
    for lesson in lesson_data:
        lesson_node_ids |= set(lesson.get("node_ids"))

    # Now create a map of content_id to node_id so that we can map between lessons, and notifications
    # which use the node id, and summary logs, which use content_id. Note that many node_ids may map
    # to the same content_id.
    content_map = {
        n[0]: n[1]
        for n in ContentNode.objects.filter_by_uuids(lesson_node_ids).values_list(
            "id", "content_id"
        )
    }

    learner_ids = {learner["id"] for learner in learners_data}

    content_ids = set(content_map.values())

    # Get all the values we need from the summary logs to be able to summarize current status on the
    # relevant content items.
    content_log_values = (
        logger_models.ContentSummaryLog.objects.filter(
            content_id__in=content_ids,
            user__in=learner_ids,
        )
        .annotate(
            attempts_exist=Exists(
                logger_models.AttemptLog.objects.filter(
                    masterylog__summarylog=OuterRef("id")
                )
            ),
            tries=SQCount(
                logger_models.MasteryLog.objects.filter(summarylog=OuterRef("id")),
                field="id",
            ),
        )
        .values(
            "user_id",
            "content_id",
            "end_timestamp",
            "time_spent",
            "progress",
            "kind",
            "attempts_exist",
            "tries",
        )
    )

    masterylog_queryset = logger_models.MasteryLog.objects.filter(
        summarylog__content_id__in=content_ids, user__in=learner_ids
    )

    practice_quiz_data = {
        "{}-{}".format(s.pop("learner_id"), s.pop("summarylog__content_id")): s
        for s in _get_quiz_status(masterylog_queryset)
    }

    # In order to make the lookup speedy, generate a unique key for each user/node that we find
    # listed in the needs help notifications that are relevant. We can then just check
    # existence of this key in the set in order to see whether this user has been flagged as needing
    # help.
    lookup_key = "{user_id}-{node_id}"
    try:
        notifications = LearnerProgressNotification.objects.filter(
            Q(notification_event=NotificationEventType.Completed)
            | Q(notification_event=NotificationEventType.Help),
            classroom_id=classroom.id,
            lesson_id__in=[lesson["id"] for lesson in lesson_data],
        ).values_list("user_id", "contentnode_id", "timestamp", "notification_event")

        needs_help = {
            lookup_key.format(user_id=n[0], node_id=n[1]): n[2]
            for n in notifications
            if n[3] == NotificationEventType.Help
        }
    except OperationalError:
        notifications = []
        repair_sqlite_db(connections[NOTIFICATIONS])

    # In case a previously flagged learner has since completed an exercise, check all the completed
    # notifications also
    completed = {
        lookup_key.format(user_id=n[0], node_id=n[1]): n[2]
        for n in notifications
        if n[3] == NotificationEventType.Completed
    }

    def get_status(log):
        """
        Read the dict from a content summary log values query and return the status
        In the case that we have found a needs help notification for the user and content node
        in question, return that they need help, otherwise return status based on their
        current progress.
        """
        content_id = log["content_id"]
        if content_id in content_map.values():
            # Don't try to lookup anything if we don't know the content_id
            # node_id mapping - might happen if a channel has since been deleted
            content_ids = [
                key for key, value in content_map.items() if value == content_id
            ]
            for c_id in content_ids:
                key = lookup_key.format(user_id=log["user_id"], node_id=c_id)
                if key in needs_help:
                    # Now check if we have not already registered completion of the content node
                    # or if we have and the timestamp is earlier than that on the needs_help event
                    if key not in completed or completed[key] < needs_help[key]:
                        return HELP_NEEDED
        if log["progress"] == 1:
            return COMPLETED
        if log["kind"] == content_kinds.EXERCISE:
            # if there are no attempt logs for this exercise, status is NOT_STARTED
            if not log["attempts_exist"]:
                return NOT_STARTED
        return STARTED

    def map_content_logs(log):
        """
        Parse the content logs to return objects in the expected format.
        """
        output = {
            "learner_id": log["user_id"],
            "content_id": log["content_id"],
            "status": get_status(log),
            "last_activity": log["end_timestamp"],
            "time_spent": log["time_spent"],
            "tries": log["tries"],
        }
        key = "{}-{}".format(log["user_id"], log["content_id"])
        if key in practice_quiz_data:
            output.update(practice_quiz_data[key])
        return output

    return list(map(map_content_logs, content_log_values))


def _map_exam_status(item):
    complete = item.pop("complete")
    item["status"] = COMPLETED if complete else STARTED
    item["exam_id"] = item.pop("summarylog__content_id")
    return item


def serialize_coach_assigned_quiz_status(queryset):
    queryset = logger_models.MasteryLog.objects.filter(
        summarylog__content_id__in=queryset.values("id"),
    ).order_by()
    return list(map(_map_exam_status, _get_quiz_status(queryset)))


def serialize_groups(queryset):
    queryset = annotate_array_aggregate(queryset, member_ids="membership__user__id")
    return list(queryset.values("id", "name", "member_ids"))


def serialize_users(queryset):
    return list(queryset.values("id", "username", name=F("full_name")))


def _map_lesson(item):
    if item["resources"]:
        item["node_ids"] = [
            resource["contentnode_id"] for resource in item["resources"]
        ]
    else:
        item["node_ids"] = []
    return item


def serialize_lessons(queryset):
    queryset = annotate_array_aggregate(
        queryset, assignments="lesson_assignments__collection"
    )
    return list(
        map(
            _map_lesson,
            queryset.values(
                "id",
                "title",
                "resources",
                "assignments",
                "description",
                "date_created",
                "is_active",
            ),
        )
    )


def _map_exam(item):
    item["assignments"] = item.pop("exam_assignments")
    item["node_ids"] = list(
        {question["exercise_id"] for question in item.get("question_sources")}
    )
    return item


def serialize_exams(queryset):
    queryset = annotate_array_aggregate(
        queryset, exam_assignments="assignments__collection"
    )
    return list(
        map(
            _map_exam,
            queryset.values(
                "id",
                "title",
                "active",
                "question_sources",
                "data_model_version",
                "question_count",
                "learners_see_fixed_order",
                "seed",
                "date_created",
                "date_archived",
                "date_activated",
                "archive",
                "exam_assignments",
            ),
        )
    )


class ClassSummaryPermissions(permissions.BasePermission):
    """
    Allow only users with admin/coach permissions on the classroom.
    """

    def has_permission(self, request, view):
        classroom_id = view.kwargs.get("pk")
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=classroom_id)
            )
        except (Collection.DoesNotExist, ValueError):
            return False


class ClassSummaryViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated, ClassSummaryPermissions)

    def retrieve(self, request, pk):
        classroom = get_object_or_404(auth_models.Classroom, id=pk)
        query_learners = FacilityUser.objects.filter(memberships__collection=classroom)
        query_lesson = Lesson.objects.filter(collection=pk)
        query_exams = Exam.objects.filter(collection=pk)
        lesson_data = serialize_lessons(query_lesson)
        exam_data = serialize_exams(query_exams)

        all_node_ids = set()
        for lesson in lesson_data:
            all_node_ids |= set(lesson.get("node_ids"))
        for exam in exam_data:
            all_node_ids |= set(exam.get("node_ids"))

        content = list(
            ContentNode.objects.filter_by_uuids(all_node_ids).values(
                "available",
                "content_id",
                "title",
                "kind",
                "channel_id",
                "options",
                node_id=F("id"),
            )
        )
        # final list of available nodes
        node_lookup = {node["node_id"]: node for node in content}

        individual_learners_group_ids = AdHocGroup.objects.filter(
            parent=classroom
        ).values_list("id", flat=True)

        # filter classes out of exam assignments
        for exam in exam_data:
            exam["groups"] = [
                g
                for g in exam["assignments"]
                if g != pk and g not in individual_learners_group_ids
            ]
            # determine if any resources are missing locally for the quiz
            exam["missing_resource"] = any(
                node_id not in node_lookup or not node_lookup[node_id]["available"]
                for node_id in exam["node_ids"]
            )

        # filter classes out of lesson assignments
        for lesson in lesson_data:
            lesson["groups"] = [
                g
                for g in lesson["assignments"]
                if g != pk and g not in individual_learners_group_ids
            ]
            # determine if any resources are missing locally for the lesson
            lesson["missing_resource"] = any(
                node_id not in node_lookup or not node_lookup[node_id]["available"]
                for node_id in lesson["node_ids"]
            )

        learners_data = serialize_users(query_learners)

        output = {
            "id": pk,
            "facility_id": classroom.parent.id,
            "name": classroom.name,
            "coaches": serialize_users(
                FacilityUser.objects.filter(
                    roles__collection=classroom, roles__kind=role_kinds.COACH
                )
            ),
            "learners": learners_data,
            "groups": serialize_groups(classroom.get_learner_groups()),
            "adhoclearners": serialize_groups(
                classroom.get_individual_learners_group()
            ),
            "exams": exam_data,
            "exam_learner_status": serialize_coach_assigned_quiz_status(query_exams),
            "content": content,
            "content_learner_status": content_status_serializer(
                lesson_data, learners_data, classroom
            ),
            "lessons": lesson_data,
        }

        return Response(output)
