from .serializers import LessonSerializer
from kolibri.auth.api import KolibriAuthPermissions
from kolibri.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.lessons.models import Lesson
from rest_framework.viewsets import ModelViewSet


class LessonViewset(ModelViewSet):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter,)
    permission_classes = (KolibriAuthPermissions,)
    queryset = Lesson.objects.all()
