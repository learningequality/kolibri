from django.db.models import Count
from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.auth.models import Facility
from kolibri.core.content.api import ContentNodeProgressViewset
from kolibri.core.content.api import ContentNodeViewset
from kolibri.core.content.api import UserContentNodeViewset
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.models import ContentSummaryLog

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


def _consolidate_courses_data(request, courses, *, course_key="course"):
    if not courses:
        return courses

    course_content_ids = {course[course_key] for course in courses}

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

    # Gather each course's non-topic descendant content ids in one pass, then
    # look up the user's completed content across all courses in a single query
    # rather than running one ContentSummaryLog count per course.
    course_meta = {}
    all_content_ids = set()
    for course_node in course_nodes:
        descendant_ids = list(
            course_node.get_descendants()
            .exclude(kind=content_kinds.TOPIC)
            .values_list("content_id", flat=True)
        )
        course_meta[course_node.id] = (
            course_node.unit_count,
            course_node.lesson_count,
            descendant_ids,
        )
        all_content_ids.update(descendant_ids)

    completed_content_ids = set(
        ContentSummaryLog.objects.filter(
            user=request.user, progress=1, content_id__in=all_content_ids
        ).values_list("content_id", flat=True)
    )

    course_data_map = {}
    for course_id, (unit_count, lesson_count, descendant_ids) in course_meta.items():
        total_content = len(descendant_ids)
        if total_content:
            user_completed_content = len(set(descendant_ids) & completed_content_ids)
            progress = user_completed_content / total_content
        else:
            progress = 0

        course_data_map[course_id] = {
            "unit_count": unit_count,
            "lesson_count": lesson_count,
            "progress": progress,
        }

    for course in courses:
        course_content_id = course[course_key]
        data = course_data_map.get(
            course_content_id, {"unit_count": 0, "lesson_count": 0, "progress": 0}
        )
        course.update(data)
        if course_key == "course":
            course["course_id"] = course.pop("course")

    return courses


def _resumable_resources(classrooms):
    for classroom in classrooms:
        for lesson in classroom["lessons"]:
            for resource in lesson["resources"]:
                yield 0 < resource["progress"] < 1


class LearnHomePageHydrationView(APIView):
    def get(self, request, format=None):
        # Inline import to avoid circular dependency: __init__.py must not
        # import from classroom.py at module level (classroom.py imports helpers
        # from this package, and Python would see a partial __init__ module).
        from kolibri.plugins.learn.viewsets.classroom import LearnerClassroomViewset

        learner_classroom_viewset = LearnerClassroomViewset()
        classrooms = []
        courses = []
        resumable_resources = []
        resumable_resources_progress = []
        if not request.user.is_anonymous:
            classrooms = learner_classroom_viewset.serialize_list(request)
            for classroom in classrooms:
                courses.extend(classroom.get("courses", []))
            # Show out-of-course resumable content only when no classroom lesson
            # resource is actively in-progress (0 < progress < 1); suppressed when
            # the user has in-progress classroom work to focus on (b6d46e2822).
            if not classrooms or not any(_resumable_resources(classrooms)):
                resumable_resources = user_contentnode_viewset.serialize_list(
                    request,
                    {
                        "resume": True,
                        "max_results": 12,
                        "ordering": "-last_interacted",
                        "exclude_course_ancestry": True,
                    },
                )
                resumable_resources_progress = (
                    contentnode_progress_viewset.serialize_list(
                        request,
                        {
                            "resume": True,
                            "max_results": 12,
                            "ordering": "-last_interacted",
                            "exclude_course_ancestry": True,
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
