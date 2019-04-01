from rest_framework import serializers

from .models import PingbackNotification
from .models import PingbackNotificationDismissed


class PingbackNotificationSerializer(serializers.ModelSerializer):
    i18n = serializers.JSONField(default="{}")

    class Meta:
        model = PingbackNotification
        fields = ("id", "version_range", "timestamp", "link_url", "i18n")


class PingbackNotificationDismissedSerializer(serializers.ModelSerializer):
    class Meta:
        model = PingbackNotificationDismissed
        fields = ("user", "notification")
