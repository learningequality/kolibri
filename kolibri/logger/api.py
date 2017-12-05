from django.db.models.query import F
from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import FacilityUser
from kolibri.content.api import OptionalPageNumberPagination
from rest_framework import filters, viewsets

from .models import AttemptLog, ContentSessionLog, ContentSummaryLog, ExamAttemptLog, ExamLog, MasteryLog, UserSessionLog
from .permissions import ExamActivePermissions
from .serializers import (
    AttemptLogSerializer, ContentSessionLogSerializer, ContentSummaryLogSerializer, ExamAttemptLogSerializer, ExamLogSerializer, MasteryLogSerializer,
    TotalContentProgressSerializer, UserSessionLogSerializer
)


class BaseLogFilter(filters.FilterSet):
    facility = filters.django_filters.MethodFilter()
    classroom = filters.django_filters.MethodFilter()
    learner_group = filters.django_filters.MethodFilter()

    # Only a superuser can filter by facilities
    def filter_facility(self, queryset, value):
        return queryset.filter(user__facility_id=value)

    def filter_classroom(self, queryset, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value,
            target_user=F("user"),
        )

    def filter_learner_group(self, queryset, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value,
            target_user=F("user"),
        )


class ContentSessionLogFilter(BaseLogFilter):

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


class ContentSummaryLogFilter(BaseLogFilter):

    class Meta:
        model = ContentSummaryLog
        fields = ['user_id', 'content_id']


class ContentSummaryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSummaryLogFilter


class TotalContentProgressViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = FacilityUser.objects.all()
    serializer_class = TotalContentProgressSerializer


class UserSessionLogFilter(BaseLogFilter):

    class Meta:
        model = UserSessionLog
        fields = ['user_id']


class UserSessionLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = UserSessionLog.objects.all()
    serializer_class = UserSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = UserSessionLogFilter


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
    content = filters.django_filters.MethodFilter()

    def filter_content(self, queryset, value):
        return queryset.filter(masterylog__summarylog__content_id=value)

    class Meta:
        model = AttemptLog
        fields = ['masterylog', 'complete', 'user', 'content']

class AttemptLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend, filters.OrderingFilter)
    queryset = AttemptLog.objects.all()
    serializer_class = AttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ('end_timestamp',)
    ordering = ('end_timestamp',)


class ExamAttemptFilter(filters.FilterSet):
    exam = filters.django_filters.MethodFilter()
    user = filters.django_filters.MethodFilter()

    def filter_exam(self, queryset, value):
        return queryset.filter(examlog__exam=value)

    def filter_user(self, queryset, value):
        return queryset.filter(examlog__user=value)

    class Meta:
        model = ExamAttemptLog
        fields = ['examlog', 'exam', 'user']

class ExamAttemptLogViewSet(viewsets.ModelViewSet):
    permission_classes = (ExamActivePermissions, KolibriAuthPermissions, )
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend, filters.OrderingFilter)
    queryset = ExamAttemptLog.objects.all()
    serializer_class = ExamAttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamAttemptFilter

class ExamLogFilter(BaseLogFilter):

    collection = filters.django_filters.MethodFilter()

    def filter_collection(self, queryset, collection_id):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F('user'),
            ancestor_collection=collection_id,
        )

    class Meta:
        model = ExamLog
        fields = ['user', 'exam']

class ExamLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ExamLog.objects.all()
    serializer_class = ExamLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamLogFilter
