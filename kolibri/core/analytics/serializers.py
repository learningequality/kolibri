from rest_framework import serializers

from .models import LocalNotification
from .models import PingbackNotification
from .models import PingbackNotificationDismissed
from kolibri.core.auth.utils.picture_passwords import get_learner_count


class PingbackNotificationSerializer(serializers.ModelSerializer):
    i18n = serializers.JSONField(default="{}")

    class Meta:
        model = PingbackNotification
        fields = ("id", "version_range", "timestamp", "link_url", "i18n")


class PingbackNotificationDismissedSerializer(serializers.ModelSerializer):
    class Meta:
        model = PingbackNotificationDismissed
        fields = ("user", "notification")


class LocalNotificationSerializer(serializers.ModelSerializer):
    """
    The row itself is just an existence check. We attach the context needed to
    render the notification — facility name and learner count for the
    requesting user's facility — so the frontend doesn't have to fetch them
    separately and the impact-story recipient gets enough detail to recognise
    the deployment.
    """

    facility_name = serializers.SerializerMethodField()
    learner_count = serializers.SerializerMethodField()

    class Meta:
        model = LocalNotification
        fields = ("id", "key", "created_at", "facility_name", "learner_count")
        read_only_fields = fields

    def _user_facility(self):
        return self.context["request"].user.facility

    def get_facility_name(self, obj):
        return self._user_facility().name

    def get_learner_count(self, obj):
        return get_learner_count(self._user_facility().dataset_id)
