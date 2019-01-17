import re

import semver
from rest_framework import viewsets

import kolibri
from .models import PingbackNotification
from .models import PingbackNotificationDismissed
from .serializers import PingbackNotificationDismissedSerializer
from .serializers import PingbackNotificationSerializer
from .utils import cmp_semver
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter


class PingbackNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PingbackNotificationSerializer

    def get_queryset(self):
        # convert kolibri version to semver format if needed (ex. 1.2.3b0.dev0+git.123.f1234567 => 1.2.3)
        kolibri_version = kolibri.__version__
        try:
            semver.parse(kolibri_version)
        except ValueError:
            kolibri_version = re.split('([a-zA-Z])', kolibri_version)[0]

        user = self.request.user
        queryset = PingbackNotification.objects.all().order_by('-timestamp')
        # filter out notifications already dismissed by the user
        if user.is_authenticated():
            notification_ids = PingbackNotificationDismissed.objects.filter(user=user).values_list('notification', flat=True)
            queryset = queryset.exclude(id__in=notification_ids)
        # only include notifications valid for the notification's semantic versioning range
        included_notifications = [notification.id for notification in queryset if cmp_semver(kolibri_version, notification.version_range)]
        return queryset.filter(id__in=included_notifications)


class PingbackNotificationDismissedViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    serializer_class = PingbackNotificationDismissedSerializer
    queryset = PingbackNotificationDismissed.objects.all()
    filter_backends = (KolibriAuthPermissionsFilter,)
