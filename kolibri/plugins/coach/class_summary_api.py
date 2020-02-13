import json

from django.db import connection
from django.db import connections
from django.db.models import CharField
from django.db.models import Count
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
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
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.query import ArrayAgg
from kolibri.core.query import GroupConcat
from kolibri.core.query import process_uuid_aggregate
from kolibri.core.sqlite.utils import repair_sqlite_db


# Intended to match  NotificationEventType
NOT_STARTED = "NotStarted"
STARTED = "Started"
HELP_NEEDED = "HelpNeeded"
COMPLETED = "Completed"


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

    # Get all the values we need from the summary logs to be able to summarize current status on the
    # relevant content items.
    content_log_values = (
        logger_models.ContentSummaryLog.objects.filter(
            content_id__in=set(content_map.values()),
            user__in=[learner["id"] for learner in learners_data],
        )
        .annotate(attempts=Count("masterylogs__attemptlogs"))
        .values(
            "user_id",
            "content_id",
            "end_timestamp",
            "time_spent",
            "progress",
            "kind",
            "attempts",
        )
    )

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
        repair_sqlite_db(connections["notifications_db"])

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
            if log["attempts"] == 0:
                return NOT_STARTED
        return STARTED

    def map_content_logs(log):
        """
        Parse the content logs to return objects in the expected format.
        """
        return {
            "learner_id": log["user_id"],
            "content_id": log["content_id"],
            "status": get_status(log),
            "last_activity": log["end_timestamp"],
            "time_spent": log["time_spent"],
        }

    return map(map_content_logs, content_log_values)


def _map_exam_status(item):
    closed = item.pop("closed")
    item["status"] = COMPLETED if closed else STARTED
    return item


def serialize_exam_status(queryset):
    return list(
        map(
            _map_exam_status,
            queryset.annotate(
                last_activity=Max("attemptlogs__end_timestamp"),
                num_correct=Subquery(
                    logger_models.ExamAttemptLog.objects.filter(examlog=OuterRef("id"))
                    .order_by()
                    .values_list("item", "content_id")
                    .distinct()
                    .values("examlog")
                    .annotate(total_correct=Sum("correct"))
                    .values("total_correct")
                ),
                num_answered=Subquery(
                    logger_models.ExamAttemptLog.objects.filter(examlog=OuterRef("id"))
                    .order_by()
                    .values_list("item", "content_id")
                    .distinct()
                    .values("examlog")
                    .annotate(total_complete=Count("id"))
                    .values("total_complete")
                ),
            )
            .values(
                "exam_id",
                "closed",
                "last_activity",
                "num_correct",
                "num_answered",
                learner_id=F("user_id"),
            )
            .order_by(),
        )
    )


def _map_group(item):
    item["member_ids"] = process_uuid_aggregate(item, "member_ids")
    return item


def serialize_groups(queryset):
    if connection.vendor == "postgresql" and ArrayAgg is not None:
        queryset = queryset.annotate(member_ids=ArrayAgg("membership__user__id"))
    else:
        queryset = queryset.values("id").annotate(
            member_ids=GroupConcat("membership__user__id", output_field=CharField())
        )
    return list(map(_map_group, queryset.values("id", "name", "member_ids")))


def serialize_users(queryset):
    return list(queryset.values("id", "username", name=F("full_name")))


def _map_lesson(item):
    item["resources"] = json.loads(item["resources"])
    item["node_ids"] = [resource["contentnode_id"] for resource in item["resources"]]
    item["assignments"] = process_uuid_aggregate(item, "assignments")
    return item


def serialize_lessons(queryset):
    if connection.vendor == "postgresql" and ArrayAgg is not None:
        queryset = queryset.annotate(
            assignments=ArrayAgg("lesson_assignments__collection")
        )
    else:
        queryset = queryset.values("id").annotate(
            assignments=GroupConcat(
                "lesson_assignments__collection", output_field=CharField()
            )
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
                active=F("is_active"),
            ),
        )
    )


def _map_exam(item):
    item["question_sources"] = json.loads(item["question_sources"])
    item["assignments"] = item.pop("exam_assignments")
    item["assignments"] = process_uuid_aggregate(item, "assignments")
    return item


def serialize_exams(queryset):
    if connection.vendor == "postgresql" and ArrayAgg is not None:
        queryset = queryset.annotate(
            exam_assignments=ArrayAgg("assignments__collection")
        )
    else:
        queryset = queryset.values("id").annotate(
            exam_assignments=GroupConcat(
                "assignments__collection", output_field=CharField()
            )
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
        query_exam_logs = logger_models.ExamLog.objects.filter(
            exam__in=query_exams
        ).order_by()

        lesson_data = serialize_lessons(query_lesson)
        exam_data = serialize_exams(query_exams)

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

        # filter classes out of lesson assignments
        for lesson in lesson_data:
            lesson["groups"] = [
                g
                for g in lesson["assignments"]
                if g != pk and g not in individual_learners_group_ids
            ]

        all_node_ids = set()
        for lesson in lesson_data:
            all_node_ids |= set(lesson.get("node_ids"))
        for exam in exam_data:
            exam_node_ids = [
                question["exercise_id"] for question in exam.get("question_sources")
            ]
            all_node_ids |= set(exam_node_ids)

        # map node ids => content_ids so we can replace missing nodes, if another matching content_id node exists
        content_id_map = {
            resource["contentnode_id"]: resource["content_id"]
            for lesson in lesson_data
            for resource in lesson.pop("resources")
        }
        query_content = ContentNode.objects.filter_by_uuids(all_node_ids)
        # final list of available nodes
        list_of_ids = [node.id for node in query_content]
        # determine a new list of node_ids for each lesson, removing/replacing missing content items
        for lesson in lesson_data:
            node_ids = []
            for node_id in lesson["node_ids"]:
                # if resource exists, add to node_ids
                if node_id in list_of_ids:
                    node_ids.append(node_id)
                else:
                    # if resource does not exist, check if another resource with same content_id exists
                    nodes = ContentNode.objects.filter(
                        content_id=content_id_map[node_id]
                    )
                    if nodes:
                        node_ids.append(nodes[0].id)
            # point to new list of node ids
            lesson["node_ids"] = node_ids

        learners_data = serialize_users(query_learners)

        output = {
            "id": pk,
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
            "exam_learner_status": serialize_exam_status(query_exam_logs),
            "content": query_content.values(
                "content_id", "title", "kind", "channel_id", node_id=F("id")
            ),
            "content_learner_status": content_status_serializer(
                lesson_data, learners_data, classroom
            ),
            "lessons": lesson_data,
        }

        return Response(output)
