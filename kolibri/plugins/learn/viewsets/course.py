from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.models import Classroom
from kolibri.core.courses.models import CourseSession

from . import _consolidate_courses_data


class LearnerCourseClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ("id", "name", "parent")


class LearnerCourseSerializer(serializers.ModelSerializer):
    classroom = LearnerCourseClassroomSerializer(source="collection", read_only=True)
    # The serializer renames "course" → "course_id" so the field_map produces
    # "course_id" before consolidate(); _consolidate_courses_data is called with
    # course_key="course_id" to match.
    course_id = serializers.CharField(source="course")
    unit_count = serializers.IntegerField(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)
    progress = serializers.FloatField(read_only=True)

    class Meta:
        model = CourseSession
        fields = (
            "id",
            "course_id",
            "title",
            "description",
            "is_active",
            "classroom",
            "unit_count",
            "lesson_count",
            "progress",
        )


class LearnerCourseViewset(ReadOnlyValuesViewset):
    """
    Special Viewset for Learners to view Course Sessions to which they are assigned.
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = LearnerCourseSerializer
    deferred_fields = ("unit_count", "lesson_count", "progress")

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return CourseSession.objects.none()
        # distinct() needed: a course session can be assigned to multiple
        # sub-collections the user belongs to (e.g. classroom + learner group),
        # which would produce duplicate rows without it (a4244f1b8e).
        return CourseSession.objects.filter(
            assignments__collection__membership__user=self.request.user,
            is_active=True,
        ).distinct()

    def consolidate(self, items, queryset):
        # The serializer field_map already renamed "course" → "course_id";
        # pass course_key so _consolidate_courses_data reads the right key.
        return _consolidate_courses_data(self.request, items, course_key="course_id")

    @action(detail=True, methods=["get"])
    def resume(self, request, pk=None):
        course_session = self.get_object()
        return Response(course_session.get_resume_data(request.user))
