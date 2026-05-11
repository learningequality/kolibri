from django.shortcuts import get_object_or_404
from le_utils.constants import modalities
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.plugins.coach.class_summary_api import fetch_notification_maps
from kolibri.plugins.coach.class_summary_api import get_content_log_values
from kolibri.plugins.coach.class_summary_api import get_log_status


def _build_content_status(content_id_to_node_ids, learner_ids, course_session):
    if not content_id_to_node_ids or not learner_ids:
        return []

    content_log_values = get_content_log_values(
        set(content_id_to_node_ids.keys()), learner_ids
    )

    node_ids = list({nid for nids in content_id_to_node_ids.values() for nid in nids})
    needs_help, completed = fetch_notification_maps(
        course_session_id=course_session.id,
        classroom_id=course_session.collection_id,
        contentnode_id__in=node_ids,
        user_id__in=learner_ids,
    )

    return [
        {
            "learner_id": log["user_id"],
            "content_id": log["content_id"],
            "status": get_log_status(
                log, content_id_to_node_ids, needs_help, completed
            ),
            "last_activity": log["end_timestamp"],
            "time_spent": log["time_spent"],
            "tries": log["tries"],
        }
        for log in content_log_values
    ]


class UnitLessonProgressViewSet(viewsets.ViewSet):
    """
    Returns lesson ContentNodes and per-learner content status for a unit's
    lessons, scoped to course session assigned learners.

    GET /api/coach/coursesession/{course_session_id}/unit/{unit_contentnode_id}/lessonprogress/
    """

    permission_classes = (KolibriAuthPermissions,)

    def retrieve(self, request, **kwargs):
        course_session_id = self.kwargs["course_session_id"]
        unit_contentnode_id = self.kwargs["unit_contentnode_id"]

        course_session = get_object_or_404(CourseSession, pk=course_session_id)
        self.check_object_permissions(request, course_session)
        get_object_or_404(ContentNode, pk=unit_contentnode_id, modality=modalities.UNIT)

        lesson_nodes = list(
            ContentNode.objects.filter(
                parent_id=unit_contentnode_id,
                modality=modalities.LESSON,
                available=True,
            )
            .order_by("lft")
            .values("id", "title")
        )

        lesson_node_ids = [ln["id"] for ln in lesson_nodes]

        resource_rows = list(
            ContentNode.objects.filter(
                parent_id__in=lesson_node_ids,
                available=True,
            )
            .order_by("lft")
            .values_list("parent_id", "id", "content_id")
        )

        lesson_content_ids = {}
        content_id_to_node_ids = {}
        for parent_id, node_id, content_id in resource_rows:
            lesson_content_ids.setdefault(parent_id, []).append(content_id)
            content_id_to_node_ids.setdefault(content_id, []).append(node_id)

        lessons = [
            {
                "id": ln["id"],
                "title": ln["title"],
                "content_ids": lesson_content_ids.get(ln["id"], []),
            }
            for ln in lesson_nodes
        ]

        learner_ids = list(
            FacilityUser.objects.filter(
                memberships__collection_id__in=course_session.assignments.values_list(
                    "collection_id", flat=True
                )
            )
            .distinct()
            .values_list("id", flat=True)
        )

        content_learner_status = _build_content_status(
            content_id_to_node_ids,
            learner_ids,
            course_session,
        )

        return Response(
            {
                "lessons": lessons,
                "content_learner_status": content_learner_status,
            }
        )
