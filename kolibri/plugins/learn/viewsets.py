from .serializers import LearnerClassroomSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from kolibri.auth.models import Classroom, KolibriAnonymousUser
from kolibri.auth.api import KolibriAuthPermissionsFilter
from rest_framework.exceptions import PermissionDenied


class LearnerClassroomViewset(ReadOnlyModelViewSet):
    """
    Returns all Classrooms for which the requesting user is a member.
    """
    serializer_class = LearnerClassroomSerializer
    filter_backends = (KolibriAuthPermissionsFilter,)

    def get_queryset(self):
        current_user = self.request.user
        if isinstance(current_user, KolibriAnonymousUser):
            raise PermissionDenied()

        memberships = current_user.memberships.filter(
            collection__kind='classroom',
        ).values('collection_id')
        return Classroom.objects.filter(id__in=memberships)
