from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.viewsets.lesson import ClassroomSerializer

from . import _consolidate_lessons_data


class LearnerLessonSerializer(serializers.ModelSerializer):
    classroom = ClassroomSerializer(source="collection", read_only=True)
    active = serializers.BooleanField(source="is_active")
    progress = serializers.DictField(read_only=True)
    missing_resource = serializers.BooleanField(read_only=True)

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "description",
            "resources",
            "active",
            "collection",
            "classroom",
            "progress",
            "missing_resource",
        )


class LearnerLessonViewset(ReadOnlyValuesViewset):
    """
    Special Viewset for Learners to view Lessons to which they are assigned.
    The core Lesson Viewset is locked down to Admin users only.
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = LearnerLessonSerializer
    deferred_fields = ("progress", "missing_resource")

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return Lesson.objects.none()
        return Lesson.objects.filter(
            lesson_assignments__collection__membership__user=self.request.user,
            is_active=True,
        )

    def consolidate(self, items, queryset):
        if not items:
            return items

        _consolidate_lessons_data(self.request, items)

        return items
