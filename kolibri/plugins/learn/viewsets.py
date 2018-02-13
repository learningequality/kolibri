from .serializers import LearnerClassroomSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from kolibri.auth.models import Classroom
from kolibri.auth.serializers import ClassroomSerializer
from kolibri.auth.models import KolibriAnonymousUser
from kolibri.auth.api import KolibriAuthPermissionsFilter
from rest_framework.exceptions import PermissionDenied


class LearnerClassroomViewset(ReadOnlyModelViewSet):
    """
    Returns all Classrooms for which the requesting User is a member.

    Use the ?no_assignments flag to just get the name and ID of the Classroom
    (e.g. when listing classes in which User is enrolled)
    """
    filter_backends = (KolibriAuthPermissionsFilter,)

    def get_queryset(self):
        current_user = self.request.user
        if isinstance(current_user, KolibriAnonymousUser):
            raise PermissionDenied()

        memberships = current_user.memberships.filter(
            collection__kind='classroom',
        ).values('collection_id')
        return Classroom.objects.filter(id__in=memberships)

    def get_serializer_class(self):
        if ('no_assignments' in self.request.query_params):
            return ClassroomSerializer
        else:
            return LearnerClassroomSerializer
