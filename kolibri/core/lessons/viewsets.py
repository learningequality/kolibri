from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet

from .serializers import LessonSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.lessons.models import Lesson


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class LessonPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Lesson POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(_ensure_raw_dict(datum))
        # Cannot have create assignments without creating the Lesson first,
        # so this doesn't try to validate the Lesson with a non-empty lesson_assignments list
        validated_data.pop('lesson_assignments')
        return request.user.can_create(model, validated_data)


class LessonViewset(ModelViewSet):
    serializer_class = LessonSerializer
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend,)
    filter_fields = ('collection',)
    permission_classes = (LessonPermissions,)
    queryset = Lesson.objects.all().order_by('-date_created')

    def get_serializer_class(self):
        return LessonSerializer
