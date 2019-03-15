from django.db.models.query import F
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .serializers import LearnerClassroomSerializer
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import Classroom
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.lessons.serializers import LessonSerializer


class LearnerClassroomViewset(ReadOnlyModelViewSet):
    """
    Returns all Classrooms for which the requesting User is a member,
    along with all associated assignments.
    """
    filter_backends = (KolibriAuthPermissionsFilter,)
    permission_classes = (IsAuthenticated,)
    serializer_class = LearnerClassroomSerializer

    def get_queryset(self):
        return HierarchyRelationsFilter(Classroom.objects.all()).filter_by_hierarchy(
            target_user=self.request.user,
            ancestor_collection=F('id')
        )


class LearnerLessonViewset(ReadOnlyModelViewSet):
    """
    Special Viewset for Learners to view Lessons to which they are assigned.
    The core Lesson Viewset is locked down to Admin users only.
    """
    serializer_class = LessonSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        assignments = HierarchyRelationsFilter(LessonAssignment.objects.all()) \
            .filter_by_hierarchy(
                target_user=self.request.user,
                ancestor_collection=F('collection')
        )
        return Lesson.objects.filter(
            lesson_assignments__in=assignments,
            is_active=True
        ).distinct()
