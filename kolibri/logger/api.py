from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.auth.models import Classroom, LearnerGroup
from kolibri.content.api import OptionalPageNumberPagination
from rest_framework import filters, viewsets

from .models import ContentInteractionLog, ContentRatingLog, ContentSummaryLog, UserSessionLog
from .serializers import ContentInteractionLogSerializer, ContentRatingLogSerializer, ContentSummaryLogSerializer, UserSessionLogSerializer


class BaseLogFilter(filters.FilterSet):
    facility = filters.django_filters.MethodFilter()
    classroom = filters.django_filters.MethodFilter()
    learner_group = filters.django_filters.MethodFilter()

    # Only device owner (superuser) can filter by facilities
    def filter_facility(self, queryset, value):
        return queryset.filter(user__facility_id=value)

    def filter_classroom(self, queryset, value):
        classroom_members_pks = Classroom.objects.get(pk=value).get_members().values_list("id", flat=True)
        return queryset.filter(user__pk__in=list(classroom_members_pks))

    def filter_learner_group(self, queryset, value):
        learnergroup_members_pks = LearnerGroup.objects.get(pk=value).get_members().values_list("id", flat=True)
        return queryset.filter(user__pk__in=list(learnergroup_members_pks))


class ContentInteractionLogFilter(BaseLogFilter):

    class Meta:
        model = ContentInteractionLog
        fields = ['user_id']


class ContentInteractionLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentInteractionLog.objects.all()
    serializer_class = ContentInteractionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentInteractionLogFilter


class ContentSummaryLogFilter(BaseLogFilter):

    class Meta:
        model = ContentSummaryLog
        fields = ['user_id']


class ContentSummaryLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSummaryLogFilter


class ContentRatingLogFilter(BaseLogFilter):

    class Meta:
        model = ContentRatingLog
        fields = ['user_id']


class ContentRatingLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, filters.DjangoFilterBackend)
    queryset = ContentRatingLog.objects.all()
    serializer_class = ContentRatingLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentRatingLogFilter


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
