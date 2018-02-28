from .serializers import LearnerClassroomSerializer
from django.db.models.query import F
from kolibri.auth.api import KolibriAuthPermissionsFilter
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import Classroom
from kolibri.auth.serializers import ClassroomSerializer
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.lessons.serializers import LessonSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet


class LearnerClassroomViewset(ReadOnlyModelViewSet):
    """
    Returns all Classrooms for which the requesting User is a member.

    Use the ?no_assignments flag to just get the name and ID of the Classroom
    (e.g. when listing classes in which User is enrolled)
    """
    filter_backends = (KolibriAuthPermissionsFilter,)
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        current_user = self.request.user
        memberships = current_user.memberships.filter(
            collection__kind='classroom',
        ).values('collection_id')
        return Classroom.objects.filter(id__in=memberships)

    def get_serializer_class(self):
        if ('no_assignments' in self.request.query_params):
            return ClassroomSerializer
        else:
            return LearnerClassroomSerializer


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
        )
