from django.db.models import Count
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.db.models.fields import IntegerField
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.content.api import ContentNodeProgressViewset
from kolibri.core.content.api import ContentNodeViewset
from kolibri.core.content.api import UserContentNodeViewset
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import exam_assignment_lookup
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog


contentnode_progress_viewset = ContentNodeProgressViewset()
contentnode_viewset = ContentNodeViewset()
user_contentnode_viewset = UserContentNodeViewset()


class LearnStateView(APIView):
    def get(self, request, format=None):
        """
        Returns some configuration variables applicable to users navigating learn.
        - in_classes: Whether the user is in any classes
        - can_download_externally: Whether the user can download content externally from Kolibri
        """
        if request.user.is_anonymous:
            default_facility = Facility.get_default_facility()
            can_download_externally = (
                default_facility.dataset.show_download_button_in_learn
                if default_facility
                else True
            )
            return Response(
                {
                    "in_classes": False,
                    "can_download_externally": can_download_externally,
                }
            )
        return Response(
            {
                "in_classes": request.user.memberships.exists(),
                "can_download_externally": request.user.dataset.show_download_button_in_learn,
            }
        )


def _map_contentnodes(request, content_ids):
    contentnodes = (
        contentnode_viewset.serialize_list(request, {"ids": content_ids})
        if content_ids
        else []
    )
    contentnode_map = {c["id"]: c for c in contentnodes}
    return contentnode_map


def _consolidate_lessons_data(request, lessons):
    lesson_contentnode_ids = set()
    for lesson in lessons:
        lesson_contentnode_ids |= {
            resource["contentnode_id"] for resource in lesson["resources"]
        }

    contentnode_progress = (
        contentnode_progress_viewset.serialize_list(
            request, {"ids": lesson_contentnode_ids}
        )
        if lesson_contentnode_ids
        else []
    )

    contentnode_map = _map_contentnodes(request, lesson_contentnode_ids)

    progress_map = {l["content_id"]: l["progress"] for l in contentnode_progress}

    for lesson in lessons:
        lesson["progress"] = {
            "resource_progress": sum(
                (
                    progress_map[resource["content_id"]]
                    for resource in lesson["resources"]
                    if resource["content_id"] in progress_map
                )
            ),
            "total_resources": len(lesson["resources"]),
        }
        missing_resource = False
        for resource in lesson["resources"]:
            resource["progress"] = progress_map.get(resource["content_id"], 0)
            resource["contentnode"] = contentnode_map.get(
                resource["contentnode_id"], None
            )
            missing_resource = missing_resource or not resource["contentnode"]
        lesson["missing_resource"] = missing_resource
        lesson["active"] = lesson.pop("is_active")


class LearnerClassroomViewset(ReadOnlyValuesViewset):
    """
    Returns all Classrooms for which the requesting User is a member,
    along with all associated assignments.
    """

    permission_classes = (IsAuthenticated,)

    values = ("id", "name")

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return Classroom.objects.none()
        return Classroom.objects.filter(membership__user=self.request.user)

    def consolidate(self, items, queryset):
        if not items:
            return items
        lessons = (
            Lesson.objects.filter(
                lesson_assignments__collection__membership__user=self.request.user,
                is_active=True,
                collection__in=(c["id"] for c in items),
            )
            .distinct()
            .values(
                "description", "id", "is_active", "title", "resources", "collection"
            )
        )
        _consolidate_lessons_data(self.request, lessons)

        user_masterylog_content_ids = MasteryLog.objects.filter(
            user=self.request.user
        ).values("summarylog__content_id")

        exams = (
            Exam.objects.filter(
                assignments__collection__membership__user=self.request.user,
                collection__in=(c["id"] for c in items),
            )
            .filter(Q(active=True) | Q(id__in=user_masterylog_content_ids))
            .annotate(
                closed=Subquery(
                    MasteryLog.objects.filter(
                        summarylog__content_id=OuterRef("id"), user=self.request.user
                    ).values("complete")[:1]
                ),
                score=Subquery(
                    AttemptLog.objects.filter(
                        sessionlog__content_id=OuterRef("id"), user=self.request.user
                    )
                    .order_by()
                    .values_list("item")
                    .distinct()
                    .values("masterylog")
                    .annotate(total_correct=Sum("correct"))
                    .values("total_correct"),
                    output_field=IntegerField(),
                ),
                answer_count=Subquery(
                    AttemptLog.objects.filter(
                        sessionlog__content_id=OuterRef("id"), user=self.request.user
                    )
                    .order_by()
                    .values_list("item")
                    .distinct()
                    .values("masterylog")
                    .annotate(total_complete=Count("id"))
                    .values("total_complete"),
                    output_field=IntegerField(),
                ),
            )
            .distinct()
            .values(
                "collection",
                "active",
                "archive",
                "id",
                "question_count",
                "title",
                "closed",
                "answer_count",
                "data_model_version",
                "score",
                "question_sources",
            )
        )
        exam_node_ids = set()

        for exam in exams:
            exam_node_ids |= {
                exercise_id
                for exercise_id, _ in exam_assignment_lookup(
                    exam.get("question_sources", [])
                )
            }

        available_exam_ids = set(
            ContentNode.objects.filter_by_uuids(exam_node_ids).values_list(
                "id", flat=True
            )
        )

        contentnode_map = _map_contentnodes(self.request, available_exam_ids)

        for exam in exams:
            closed = exam.pop("closed")
            score = exam.pop("score")
            answer_count = exam.pop("answer_count")
            if closed is not None:
                exam["progress"] = {
                    "closed": closed,
                    "score": score,
                    "answer_count": answer_count,
                    "started": True,
                }
            else:
                exam["progress"] = {
                    "score": None,
                    "answer_count": None,
                    "closed": None,
                    "started": False,
                }
            missing_resource = False
            for exercise_id, _ in exam_assignment_lookup(
                exam.get("question_sources", [])
            ):
                if exercise_id not in contentnode_map:
                    missing_resource = True
                    break
            exam["missing_resource"] = missing_resource
        out_items = []
        for item in items:
            item["assignments"] = {
                "exams": [exam for exam in exams if exam["collection"] == item["id"]],
                "lessons": [
                    lesson for lesson in lessons if lesson["collection"] == item["id"]
                ],
            }
            out_items.append(item)
        return out_items


learner_classroom_viewset = LearnerClassroomViewset()


def _resumable_resources(classrooms):
    for classroom in classrooms:
        for lesson in classroom["assignments"]["lessons"]:
            for resource in lesson["resources"]:
                yield 0 < resource["progress"] < 1


class LearnHomePageHydrationView(APIView):
    def get(self, request, format=None):
        classrooms = []
        resumable_resources = []
        resumable_resources_progress = []
        if not request.user.is_anonymous:
            classrooms = learner_classroom_viewset.serialize_list(request)
            if not classrooms or not any(_resumable_resources(classrooms)):
                resumable_resources = user_contentnode_viewset.serialize_list(
                    request,
                    {"resume": True, "max_results": 12, "ordering": "-last_interacted"},
                )
                resumable_resources_progress = (
                    contentnode_progress_viewset.serialize_list(
                        request,
                        {
                            "resume": True,
                            "max_results": 12,
                            "ordering": "-last_interacted",
                        },
                    )
                )

        return Response(
            {
                "classrooms": classrooms,
                "resumable_resources": resumable_resources,
                "resumable_resources_progress": resumable_resources_progress,
            }
        )


def _map_lesson_classroom(item):
    return {
        "id": item.pop("collection__id"),
        "name": item.pop("collection__name"),
        "parent": item.pop("collection__parent_id"),
    }


class LearnerLessonViewset(ReadOnlyValuesViewset):
    """
    Special Viewset for Learners to view Lessons to which they are assigned.
    The core Lesson Viewset is locked down to Admin users only.
    """

    permission_classes = (IsAuthenticated,)

    values = (
        "id",
        "title",
        "description",
        "resources",
        "is_active",
        "collection",
        "collection__id",
        "collection__name",
        "collection__parent_id",
    )

    field_map = {"classroom": _map_lesson_classroom}

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return Lesson.objects.none()
        return Lesson.objects.filter(
            lesson_assignments__collection__membership__user=self.request.user,
            is_active=True,
        )

    def consolidate(self, items, queryset):
        if not items:
            return items

        _consolidate_lessons_data(self.request, items)

        return items
