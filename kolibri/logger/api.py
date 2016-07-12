from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.content.api import OptionalPageNumberPagination
from rest_framework import viewsets

from .models import ContentInteractionLog, ContentRatingLog, ContentSummaryLog, UserSessionLog
from .serializers import ContentInteractionLogSerializer, ContentRatingLogSerializer, ContentSummaryLogSerializer, UserSessionLogSerializer


class ContentInteractionLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentInteractionLog.objects.all()
    serializer_class = ContentInteractionLogSerializer
    pagination_class = OptionalPageNumberPagination

class ContentSummaryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogSerializer
    pagination_class = OptionalPageNumberPagination

class ContentRatingLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = ContentRatingLog.objects.all()
    serializer_class = ContentRatingLogSerializer
    pagination_class = OptionalPageNumberPagination

class UserSessionLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = UserSessionLog.objects.all()
    serializer_class = UserSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
