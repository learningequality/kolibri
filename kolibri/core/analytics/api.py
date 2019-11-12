from rest_framework import viewsets

import kolibri
from .models import PingbackNotification
from .models import PingbackNotificationDismissed
from .serializers import PingbackNotificationDismissedSerializer
from .serializers import PingbackNotificationSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.utils.version import version_matches_range


class PingbackNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PingbackNotificationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PingbackNotification.objects.filter(active=True).order_by(
            "-timestamp"
        )
        # filter out notifications already dismissed by the user
        if user.is_authenticated():
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
