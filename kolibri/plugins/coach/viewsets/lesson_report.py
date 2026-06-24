from django.db.models import Count
from rest_framework import permissions
from rest_framework import serializers
from rest_framework import viewsets

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSummaryLog


class LessonReportSerializer(serializers.ModelSerializer):
    """
    Annotates a Lesson with a 'progress' array, which maps 1-to-1 with Lesson.resources.
    Each entry in the 'progress' array gives the total number of Learners who have
    been assigned the Lesson and have 'mastered' the Resource.
    """

    progress = serializers.SerializerMethodField()
    total_learners = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ("id", "title", "progress", "total_learners")

    def to_representation(self, instance):
        self._learners = instance.get_all_learners()
        return super().to_representation(instance)

    def get_progress(self, instance):
        if not self._learners.exists():
            return []
        return [self._resource_progress(r) for r in instance.resources]

    def get_total_learners(self, instance):
        return self._learners.count()

    def _resource_progress(self, resource):
        response = {
            "contentnode_id": resource["contentnode_id"],
            "num_learners_completed": 0,
        }
        result = (
            ContentSummaryLog.objects.filter(
                content_id=resource["content_id"],
                user__in=self._learners,
                progress=1.0,
            )
            .values("content_id")
            .annotate(total=Count("pk"))
            .first()
        )
        if result:
            response["num_learners_completed"] = result["total"]
        return response


class LessonReportPermissions(permissions.BasePermission):
    """
    List - check if requester has coach/admin permissions on whole facility.
    Detail - check if requester has permissions on the Classroom.
    """

    def has_permission(self, request, view):
        report_pk = view.kwargs.get("pk", None)
        if report_pk is None:
            collection_id = request.user.facility_id
        else:
            collection_id = Lesson.objects.get(pk=report_pk).collection.id

        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]

        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=collection_id)
            )
        except (Collection.DoesNotExist, ValueError):
            return False


class LessonReportViewset(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.IsAuthenticated, LessonReportPermissions)
    serializer_class = LessonReportSerializer
    queryset = Lesson.objects.all()
