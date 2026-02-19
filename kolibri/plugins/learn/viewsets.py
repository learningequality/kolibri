from django.db.models import Count
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.db.models.fields import IntegerField
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework.decorators import action
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
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import TestStatus
from kolibri.core.courses.models import TestType
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import exam_assignment_lookup
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
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


def _consolidate_courses_data(request, courses):
    if not courses:
        return courses

    course_content_ids = {course["course"] for course in courses}

    course_nodes = ContentNode.objects.filter(id__in=course_content_ids).annotate(
        unit_count=Count(
            "children", filter=Q(children__modality=modalities.UNIT), distinct=True
        ),
        lesson_count=Count(
            "children__children",
            filter=Q(
                children__modality=modalities.UNIT,
                children__children__modality=modalities.LESSON,
            ),
            distinct=True,
        ),
    )

    course_data_map = {}

    for course_node in course_nodes:
        content_qs = (
            course_node.get_descendants()
            .exclude(kind=content_kinds.TOPIC)
            .values_list("content_id", flat=True)
        )

        total_content = content_qs.count()

        user_completed_content = 0
        if total_content:
            user_completed_content = ContentSummaryLog.objects.filter(
                user=request.user, progress=1, content_id__in=content_qs
            ).count()
            progress = user_completed_content / total_content
        else:
            progress = 0

        course_data_map[course_node.id] = {
            "unit_count": course_node.unit_count,
            "lesson_count": course_node.lesson_count,
            "progress": progress,
        }

    for course in courses:
        course_id = course["course"]
        data = course_data_map.get(
            course_id, {"unit_count": 0, "lesson_count": 0, "progress": 0}
        )
        course.update(data)
        course["course_id"] = course.pop("course")

    return courses


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
                "instant_report_visibility",
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

        courses = (
            CourseSession.objects.filter(
                assignments__collection__membership__user=self.request.user,
                collection__in=(c["id"] for c in items),
                is_active=True,
            )
            .distinct()
            .values("id", "course", "title", "description", "is_active", "collection")
        )

        courses = _consolidate_courses_data(self.request, courses) if courses else []

        out_items = []
        for item in items:
            item["exams"] = [exam for exam in exams if exam["collection"] == item["id"]]
            item["lessons"] = [
                lesson for lesson in lessons if lesson["collection"] == item["id"]
            ]
            item["courses"] = [
                course for course in courses if course["collection"] == item["id"]
            ]
            out_items.append(item)
        return out_items


learner_classroom_viewset = LearnerClassroomViewset()


def _resumable_resources(classrooms):
    for classroom in classrooms:
        for lesson in classroom["lessons"]:
            for resource in lesson["resources"]:
                yield 0 < resource["progress"] < 1


class LearnHomePageHydrationView(APIView):
    def get(self, request, format=None):
        classrooms = []
        courses = []
        resumable_resources = []
        resumable_resources_progress = []
        if not request.user.is_anonymous:
            classrooms = learner_classroom_viewset.serialize_list(request)
            for classroom in classrooms:
                courses.extend(classroom.get("courses", []))
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
                "courses": courses,
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


class LearnerCourseViewset(ReadOnlyValuesViewset):
    """
    Special Viewset for Learners to view Course Sessions to which they are assigned.
    """

    permission_classes = (IsAuthenticated,)

    values = (
        "id",
        "course",
        "title",
        "description",
        "is_active",
        "collection__id",
        "collection__name",
        "collection__parent_id",
    )

    field_map = {
        "classroom": lambda item: {
            "id": item.pop("collection__id"),
            "name": item.pop("collection__name"),
            "parent": item.pop("collection__parent_id"),
        },
    }

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return CourseSession.objects.none()
        return CourseSession.objects.filter(
            assignments__collection__membership__user=self.request.user,
            is_active=True,
        ).distinct()

    def consolidate(self, items, queryset):
        if not items:
            return items

        items = _consolidate_courses_data(self.request, items)

        return items

    @action(detail=True, methods=["get"])
    def resume(self, request, pk=None):
        response_data = {
            "started": False,
            "active_test": None,
            "resume_position": None,
        }

        course_session = self.get_object()
        unit_test_assignments_qs = course_session.unit_test_assignments.filter(
            collection__membership__user=request.user
        )
        unit_test_active = unit_test_assignments_qs.filter(
            status=TestStatus.Active,
        ).first()

        if unit_test_active:
            response_data["active_test"] = {
                "unit_id": unit_test_active.unit_contentnode_id,
                "test_type": unit_test_active.test_type,
            }
            response_data["started"] = True
            return Response(response_data)

        most_recent_pre_test_completed = (
            unit_test_assignments_qs.filter(
                status=TestStatus.Ended,
                test_type=TestType.Pre,
            )
            .annotate(
                unit_sort_order=Subquery(
                    ContentNode.objects.filter(
                        id=OuterRef("unit_contentnode_id")
                    ).values("lft")[:1]
                ),
            )
            .order_by("-unit_sort_order")
            .first()
        )

        if not most_recent_pre_test_completed:
            # Course not started yet
            return Response(response_data)

        # it has at least one pre-test completed, so mark as started
        response_data["started"] = True

        unit_contentnode_id = most_recent_pre_test_completed.unit_contentnode_id
        first_incomplete_resource = (
            ContentNode.objects.filter(
                parent__parent=unit_contentnode_id,
                available=True,
            )
            .annotate(
                learner_progress=Subquery(
                    ContentSummaryLog.objects.filter(
                        user=request.user,
                        content_id=OuterRef("content_id"),
                    ).values("progress")[:1]
                ),
            )
            .filter(Q(learner_progress__lt=1) | Q(learner_progress__isnull=True))
            .order_by("lft")
            .first()
        )

        if first_incomplete_resource:
            response_data["resume_position"] = {
                "unit_id": unit_contentnode_id,
                "lesson_id": first_incomplete_resource.parent_id,
                "resource_id": first_incomplete_resource.id,
            }

        return Response(response_data)
