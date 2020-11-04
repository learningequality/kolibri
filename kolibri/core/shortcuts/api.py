import logging

from django.db.models import Q
from rest_framework import viewsets

from .models import Shortcut
from .serializers import ShortcutSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.api import ContentNodeViewset

logger = logging.getLogger(__name__)


class ShortcutViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    serializer_class = ShortcutSerializer

    def get_queryset(self):
        return _filter_shortcuts(self.request)


class ShortcutContentNodeViewSet(ContentNodeViewset):
    def get_queryset(self):
        # Filter for shortcuts that belong to the request user, or to nobody.
        shortcuts = _filter_shortcuts(self.request)
        return (
            super(ShortcutContentNodeViewSet, self)
            .get_queryset()
            .filter(pk__in=shortcuts.values("contentnode"))
            .order_by("channel_id", "lft")
        )


def _filter_shortcuts(request):
    # Filter for shortcuts that belong to the request user, or to nobody.
    shortcuts_query = Q(user=None)
    if request.user.is_authenticated():
        shortcuts_query |= Q(user=request.user)
    return Shortcut.objects.filter(shortcuts_query)
