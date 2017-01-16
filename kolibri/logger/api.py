from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.content.api import OptionalPageNumberPagination
from rest_framework import filters, viewsets

from .models import AttemptLog, ContentRatingLog, ContentSessionLog, ContentSummaryLog, MasteryLog, UserSessionLog
from .serializers import (
    AttemptLogSerializer, ContentRatingLogSerializer, ContentSessionLogSerializer, ContentSummaryLogSerializer, MasteryLogSerializer, UserSessionLogSerializer
)


class ContentSessionLogFilter(filters.FilterSet):

    class Meta:
        model = ContentSessionLog
        fields = ['user_id', 'content_id']


class ContentSessionLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentSessionLog.objects.all()
    serializer_class = ContentSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSessionLogFilter


class ContentSummaryFilter(filters.FilterSet):

    class Meta:
        model = ContentSummaryLog
        fields = ['user_id', 'content_id']


class ContentSummaryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSummaryFilter


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

class MasteryFilter(filters.FilterSet):

    class Meta:
        model = MasteryLog
        fields = ['summarylog']

class MasteryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = MasteryLog.objects.all()
    serializer_class = MasteryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = MasteryFilter

class AttemptFilter(filters.FilterSet):

    class Meta:
        model = AttemptLog
        fields = ['masterylog', 'complete']

class AttemptLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend, filters.OrderingFilter)
    queryset = AttemptLog.objects.all()
    serializer_class = AttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ('end_timestamp',)
    ordering = ('end_timestamp',)
