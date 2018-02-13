from .serializers import LessonSerializer
from django_filters.rest_framework import DjangoFilterBackend
from kolibri.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.lessons.models import Lesson
from rest_framework.viewsets import ModelViewSet


class LessonViewset(ModelViewSet):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filter_fields = ('collection',)
    queryset = Lesson.objects.all()
