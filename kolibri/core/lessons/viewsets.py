from rest_framework.viewsets import ModelViewSet
from .serializers import LessonSerializer
from kolibri.core.lessons.models import Lesson

class LessonViewset(ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        queryset = Lesson.objects.filter(is_archived=False)

        classid = self.request.query_params.get('classid', None)

        if classid is not None:
            queryset = queryset.filter(collection_id=classid)

        return queryset
