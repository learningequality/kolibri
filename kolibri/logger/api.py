from django.db.models.query import F
from django_filters import ModelChoiceFilter
from django_filters.rest_framework import CharFilter, DjangoFilterBackend, FilterSet
from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import Classroom, Collection, Facility, FacilityUser, LearnerGroup
from kolibri.content.api import OptionalPageNumberPagination
from kolibri.core.exams.models import Exam
from rest_framework import filters, viewsets

from .models import AttemptLog, ContentSessionLog, ContentSummaryLog, ExamAttemptLog, ExamLog, MasteryLog, UserSessionLog
from .permissions import ExamActivePermissions
from .serializers import (
    AttemptLogSerializer, ContentSessionLogSerializer, ContentSummaryLogSerializer, ExamAttemptLogSerializer, ExamLogSerializer, MasteryLogSerializer,
    TotalContentProgressSerializer, UserSessionLogSerializer
)


class BaseLogFilter(FilterSet):
    facility = ModelChoiceFilter(method="filter_facility", queryset=Facility.objects.all())
    classroom = ModelChoiceFilter(method="filter_classroom", queryset=Classroom.objects.all())
    learner_group = ModelChoiceFilter(method="filter_learner_group", queryset=LearnerGroup.objects.all())

    # Only a superuser can filter by facilities
    def filter_facility(self, queryset, name, value):
        return queryset.filter(user__facility=value)

    def filter_classroom(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value,
            target_user=F("user"),
        )

    def filter_learner_group(self, queryset, name, value):
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
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
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
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
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
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSessionLog.objects.all()
    serializer_class = UserSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = UserSessionLogFilter


class MasteryFilter(FilterSet):

    class Meta:
        model = MasteryLog
        fields = ['summarylog']

class MasteryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = MasteryLog.objects.all()
    serializer_class = MasteryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = MasteryFilter

class AttemptFilter(FilterSet):
    content = CharFilter(method="filter_content")

    def filter_content(self, queryset, name, value):
        return queryset.filter(masterylog__summarylog__content_id=value)

    class Meta:
        model = AttemptLog
        fields = ['masterylog', 'complete', 'user', 'content']

class AttemptLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend, filters.OrderingFilter)
    queryset = AttemptLog.objects.all()
    serializer_class = AttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ('end_timestamp',)
    ordering = ('end_timestamp',)


class ExamAttemptFilter(FilterSet):
    exam = ModelChoiceFilter(method="filter_exam", queryset=Exam.objects.all())
    user = ModelChoiceFilter(method="filter_user", queryset=FacilityUser.objects.all())

    def filter_exam(self, queryset, name, value):
        return queryset.filter(examlog__exam=value)

    def filter_user(self, queryset, name, value):
        return queryset.filter(examlog__user=value)

    class Meta:
        model = ExamAttemptLog
        fields = ['examlog', 'exam', 'user']

class ExamAttemptLogViewSet(viewsets.ModelViewSet):
    permission_classes = (ExamActivePermissions, KolibriAuthPermissions, )
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend, filters.OrderingFilter)
    queryset = ExamAttemptLog.objects.all()
    serializer_class = ExamAttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamAttemptFilter

class ExamLogFilter(BaseLogFilter):

    collection = ModelChoiceFilter(method="filter_collection", queryset=Collection.objects.all())

    def filter_collection(self, queryset, name, collection):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F('user'),
            ancestor_collection=collection,
        )

    class Meta:
        model = ExamLog
        fields = ['user', 'exam']

class ExamLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ExamLog.objects.all()
    serializer_class = ExamLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamLogFilter
