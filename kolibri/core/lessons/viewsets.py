from rest_framework.viewsets import ModelViewSet
from .serializers import LessonSerializer
from kolibri.core.lessons.models import Lesson

class LessonViewset(ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(is_archived=False)
