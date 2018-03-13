from django.db.models.query import F
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import pagination
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.auth.api import KolibriAuthPermissions
from kolibri.auth.api import KolibriAuthPermissionsFilter
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.core.exams import models
from kolibri.core.exams import serializers


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """
    page_size = None
    page_size_query_param = "page_size"

class ExamFilter(FilterSet):

    class Meta:
        model = models.Exam
        fields = ['collection', ]

class ExamViewset(viewsets.ModelViewSet):
    serializer_class = serializers.ExamSerializer
    pagination_class = OptionalPageNumberPagination
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filter_class = ExamFilter

    def get_queryset(self):
        return models.Exam.objects.all()

    def perform_update(self, serializer):
        was_active = serializer.instance.active
        serializer.save()
        if was_active and not serializer.instance.active:
            # Has changed from active to not active, set completion_timestamps on all non closed examlogs
            serializer.instance.examlogs.filter(completion_timestamp__isnull=True).update(completion_timestamp=now())


class ExamAssignmentViewset(viewsets.ModelViewSet):
    pagination_class = OptionalPageNumberPagination
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)

    def get_queryset(self):
        return models.ExamAssignment.objects.all()

    def get_serializer_class(self):
        if hasattr(self, 'action') and self.action == 'create':
            return serializers.ExamAssignmentCreationSerializer
        return serializers.ExamAssignmentRetrieveSerializer


class UserExamViewset(viewsets.ModelViewSet):
    serializer_class = serializers.UserExamSerializer
    pagination_class = OptionalPageNumberPagination
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)

    def get_queryset(self):
        return models.ExamAssignment.objects.all()

    def retrieve(self, request, pk=None, **kwargs):
        exam = get_object_or_404(models.Exam.objects.all(), id=pk)
        assignment = HierarchyRelationsFilter(exam.assignments.get_queryset()).filter_by_hierarchy(
            target_user=request.user,
            ancestor_collection=F('collection'),
        ).first()
        serializer = serializers.UserExamSerializer(assignment, context={'request': request})
        return Response(serializer.data)
