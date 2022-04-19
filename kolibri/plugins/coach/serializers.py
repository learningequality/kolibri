from django.db.models import Count
from rest_framework import serializers

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

    def get_progress(self, instance):
        learners = instance.get_all_learners()
        if learners.count() == 0:
            return []

        return [self._resource_progress(r, learners) for r in instance.resources]

    def get_total_learners(self, instance):
        return instance.get_all_learners().count()

    def _resource_progress(self, resource, learners):
        response = {
            "contentnode_id": resource["contentnode_id"],
            "num_learners_completed": 0,
        }
        completed_content_logs = (
            ContentSummaryLog.objects.filter(
                content_id=resource["content_id"], user__in=learners, progress=1.0
            )
            .values("content_id")
            .annotate(total=Count("pk"))
        )

        # If no logs for the Content Item,
        if completed_content_logs.count() == 0:
            return response
        response["num_learners_completed"] = completed_content_logs[0]["total"]
        return response
