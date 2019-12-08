import json

from django.db.models import Count
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import Classroom
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog


class LearnerClassroomViewset(ValuesViewset):
    """
    Returns all Classrooms for which the requesting User is a member,
    along with all associated assignments.
    """

    filter_backends = (KolibriAuthPermissionsFilter,)
    permission_classes = (IsAuthenticated,)

    read_only = True

    values = ("id", "name")

    def get_queryset(self):
        if self.request.user.is_anonymous():
            return Classroom.objects.none()
        else:
            return Classroom.objects.filter(membership__user=self.request.user)

    def consolidate(self, items):
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
        lesson_content_ids = set()
        for lesson in lessons:
            lesson["resources"] = json.loads(lesson["resources"])
            lesson_content_ids |= set(
                (resource["content_id"] for resource in lesson["resources"])
            )

        progress_map = {
            l["content_id"]: l["progress"]
            for l in ContentSummaryLog.objects.filter(
                content_id__in=lesson_content_ids, user=self.request.user
            ).values("content_id", "progress")
        }

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

        exams = (
            Exam.objects.filter(
                assignments__collection__membership__user=self.request.user,
                collection__in=(c["id"] for c in items),
            )
            .filter(Q(active=True) | Q(examlogs__user=self.request.user))
            .annotate(
                closed=Subquery(
                    ExamLog.objects.filter(
                        exam=OuterRef("id"), user=self.request.user
                    ).values("closed")[:1]
                ),
                score=Subquery(
                    ExamAttemptLog.objects.filter(
                        examlog__exam=OuterRef("id"), user=self.request.user
                    )
                    .order_by()
                    .values_list("item", "content_id")
                    .distinct()
                    .values("examlog")
                    .annotate(total_correct=Sum("correct"))
                    .values("total_correct")
                ),
                answer_count=Subquery(
                    ExamAttemptLog.objects.filter(
                        examlog__exam=OuterRef("id"), user=self.request.user
                    )
                    .order_by()
                    .values_list("item", "content_id")
                    .distinct()
                    .values("examlog")
                    .annotate(total_complete=Count("id"))
                    .values("total_complete")
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
                "score",
            )
        )

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


def _map_lesson_classroom(item):
    return {
        "id": item.pop("collection__id"),
        "name": item.pop("collection__name"),
        "parent": item.pop("collection__parent_id"),
    }


class LearnerLessonViewset(ValuesViewset):
    """
    Special Viewset for Learners to view Lessons to which they are assigned.
    The core Lesson Viewset is locked down to Admin users only.
    """

    permission_classes = (IsAuthenticated,)

    read_only = True

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

    field_map = {
        "classroom": _map_lesson_classroom,
        "resources": lambda x: json.loads(x["resources"]),
    }

    def get_queryset(self):
        if self.request.user.is_anonymous():
            return Lesson.objects.none()
        else:
            return Lesson.objects.filter(
                lesson_assignments__collection__membership__user=self.request.user,
                is_active=True,
            )
