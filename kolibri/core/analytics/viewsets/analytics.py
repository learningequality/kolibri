from rest_framework import mixins
from rest_framework import serializers
from rest_framework import viewsets

import kolibri
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.auth.utils.picture_passwords import get_learner_count
from kolibri.core.device.permissions import IsSuperuser
from kolibri.utils.version import version_matches_range

from ..models import LocalNotification
from ..models import PingbackNotification
from ..models import PingbackNotificationDismissed


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

    def get_facility_name(self, obj):
        return self.context["request"].user.facility.name

    def get_learner_count(self, obj):
        return get_learner_count(self.context["request"].user.facility.dataset_id)


class PingbackNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PingbackNotificationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PingbackNotification.objects.filter(active=True).order_by(
            "-timestamp"
        )
        # filter out notifications already dismissed by the user
        if user.is_authenticated:
            notification_ids = PingbackNotificationDismissed.objects.filter(
                user=user
            ).values_list("notification", flat=True)
            queryset = queryset.exclude(id__in=notification_ids)
        # only include notifications valid for the notification's semantic versioning range
        included_notifications = [
            notification.id
            for notification in queryset
            if version_matches_range(kolibri.__version__, notification.version_range)
        ]
        return queryset.filter(id__in=included_notifications)


class PingbackNotificationDismissedViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    serializer_class = PingbackNotificationDismissedSerializer
    queryset = PingbackNotificationDismissed.objects.all()
    filter_backends = (KolibriAuthPermissionsFilter,)


class LocalNotificationViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (IsSuperuser,)
    serializer_class = LocalNotificationSerializer
    queryset = LocalNotification.objects.all().order_by("-created_at")
