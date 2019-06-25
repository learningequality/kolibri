import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db.models.query import F
from django.db.utils import IntegrityError
from django.http import Http404
from django_filters import ModelChoiceFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AttemptLog
from .models import ContentSessionLog
from .models import ContentSummaryLog
from .models import ExamAttemptLog
from .models import ExamLog
from .models import MasteryLog
from .models import UserSessionLog
from .permissions import ExamActivePermissions
from .serializers import AttemptLogSerializer
from .serializers import ContentSessionLogSerializer
from .serializers import ContentSummaryLogSerializer
from .serializers import ExamAttemptLogSerializer
from .serializers import ExamLogSerializer
from .serializers import MasteryLogSerializer
from .serializers import TotalContentProgressSerializer
from .serializers import UserSessionLogSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.content.api import OptionalPageNumberPagination
from kolibri.core.exams.models import Exam

logger = logging.getLogger(__name__)


class BaseLogFilter(FilterSet):
    facility = ModelChoiceFilter(
        method="filter_facility", queryset=Facility.objects.all()
    )
    classroom = ModelChoiceFilter(
        method="filter_classroom", queryset=Classroom.objects.all()
    )
    learner_group = ModelChoiceFilter(
        method="filter_learner_group", queryset=LearnerGroup.objects.all()
    )

    # Only a superuser can filter by facilities
    def filter_facility(self, queryset, name, value):
        return queryset.filter(user__facility=value)

    def filter_classroom(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value, target_user=F("user")
        )

    def filter_learner_group(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value, target_user=F("user")
        )


class LoggerViewSet(viewsets.ModelViewSet):
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        model = self.queryset.model
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        try:
            instance = model.objects.get(id=self.kwargs[lookup_url_kwarg])
            self.check_object_permissions(request, instance)
        except (ValueError, ObjectDoesNotExist):
            raise Http404
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        default_response = dict(request.data)
        # First look if the computed fields to be updated are listed:
        updating_fields = getattr(serializer.root, "update_fields", None)
        # If not, fetch all the fields that are computed methods:
        if updating_fields is None:
            updating_fields = [
                field
                for field in serializer.fields
                if getattr(serializer.fields[field], "method_name", None)
            ]
        for field in updating_fields:
            method_name = getattr(serializer.fields[field], "method_name", None)
            if method_name:
                method = getattr(serializer.root, method_name)
                default_response[field] = method(instance)
        return Response(default_response)

    def create(self, request, *args, **kwargs):
        try:
            return super(LoggerViewSet, self).create(request, *args, **kwargs)
        except IntegrityError:
            # The object has been created previously: let's calculate its id and return it
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            obj = serializer.Meta.model(**serializer.validated_data)
            obj.id = obj.calculate_uuid()
            final_obj = self.get_serializer(obj)
            return Response(final_obj.data)
        except ValidationError as e:
            logger.error("Failed to validate data: {}".format(e))
            return Response(request.data, status.HTTP_400_BAD_REQUEST)


class ContentSessionLogFilter(BaseLogFilter):
    class Meta:
        model = ContentSessionLog
        fields = ["user_id", "content_id"]


class ContentSessionLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ContentSessionLog.objects.all()
    serializer_class = ContentSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSessionLogFilter


class ContentSummaryLogFilter(BaseLogFilter):
    class Meta:
        model = ContentSummaryLog
        fields = ["user_id", "content_id"]


class ContentSummaryLogViewSet(LoggerViewSet):
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
        fields = ["user_id"]


class UserSessionLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSessionLog.objects.all()
    serializer_class = UserSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = UserSessionLogFilter


class MasteryFilter(FilterSet):
    class Meta:
        model = MasteryLog
        fields = ["summarylog"]


class MasteryLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = MasteryLog.objects.all()
    serializer_class = MasteryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = MasteryFilter


class AttemptFilter(BaseLogFilter):
    content = CharFilter(method="filter_content")

    def filter_content(self, queryset, name, value):
        return queryset.filter(masterylog__summarylog__content_id=value)

    class Meta:
        model = AttemptLog
        fields = ["masterylog", "complete", "user", "content", "item"]


class AttemptLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    )
    queryset = AttemptLog.objects.all()
    serializer_class = AttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ("end_timestamp",)
    ordering = ("end_timestamp",)


class ExamAttemptFilter(BaseLogFilter):
    exam = ModelChoiceFilter(method="filter_exam", queryset=Exam.objects.all())
    user = ModelChoiceFilter(method="filter_user", queryset=FacilityUser.objects.all())
    content = CharFilter(field_name="content_id")

    def filter_exam(self, queryset, name, value):
        return queryset.filter(examlog__exam=value)

    def filter_user(self, queryset, name, value):
        return queryset.filter(examlog__user=value)

    class Meta:
        model = ExamAttemptLog
        fields = ["examlog", "exam", "user", "content", "item"]


class ExamAttemptLogViewSet(LoggerViewSet):
    permission_classes = (ExamActivePermissions, KolibriAuthPermissions)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    )
    queryset = ExamAttemptLog.objects.all()
    serializer_class = ExamAttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamAttemptFilter


class ExamLogFilter(BaseLogFilter):

    collection = ModelChoiceFilter(
        method="filter_collection", queryset=Collection.objects.all()
    )

    def filter_collection(self, queryset, name, collection):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F("user"), ancestor_collection=collection
        )

    class Meta:
        model = ExamLog
        fields = ["user", "exam"]


class ExamLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ExamLog.objects.all()
    serializer_class = ExamLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamLogFilter
