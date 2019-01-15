from rest_framework import viewsets

from .models import PingbackNotification
from .models import PingbackNotificationDismissed
from .serializers import PingbackNotificationDismissedSerializer
from .serializers import PingbackNotificationSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter


class PingbackNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PingbackNotificationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PingbackNotification.objects.all()
        if user.is_authenticated():
            notification_ids = PingbackNotificationDismissed.objects.filter(user=user).values_list('notification', flat=True)
            return queryset.exclude(id__in=notification_ids)
        return queryset


class PingbackNotificationDismissedViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    serializer_class = PingbackNotificationDismissedSerializer
    queryset = PingbackNotificationDismissed.objects.all()
    filter_backends = (KolibriAuthPermissionsFilter,)
