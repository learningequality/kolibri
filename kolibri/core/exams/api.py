from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import pagination
from rest_framework import viewsets

from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import Collection, FacilityUser, Membership
from kolibri.core.logger.models import ExamLog
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
        fields = ["collection"]


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class ExamPermissions(KolibriAuthPermissions):
    # Overrides the default validator to sanitize the Exam POST Payload
    # before validation
    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        # Cannot have create assignments without creating the Exam first,
        # so this doesn't try to validate the Exam with a non-empty assignments list
        validated_data.pop("assignments")
        return request.user.can_create(model, validated_data)


class ExamViewset(viewsets.ModelViewSet):
    serializer_class = serializers.ExamSerializer
    pagination_class = OptionalPageNumberPagination
    permission_classes = (ExamPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    filter_class = ExamFilter

    def get_queryset(self):
        return models.Exam.objects.all()

    def perform_update(self, serializer):
        was_active = serializer.instance.active
        was_archived = serializer.instance.archive
        serializer.save()

        if was_active and not serializer.instance.active:
            # Has changed from active to not active, set completion_timestamps on all non closed examlogs
            serializer.instance.examlogs.filter(
                completion_timestamp__isnull=True
            ).update(completion_timestamp=now())

        if not was_archived and serializer.instance.archive:
            exam_assignments = models.ExamAssignment.objects.filter(
                exam_id=serializer.instance.id
            )
            memberships = Membership.objects.filter(
                collection_id__in=[e.collection_id for e in exam_assignments]
            )
            learners = FacilityUser.objects.filter(
                id__in=[m.user_id for m in memberships]
            )
            existing_exam_log_learner_ids = ExamLog.objects.filter(
                exam_id=serializer.instance.id
            ).values_list("user_id", flat=True)
            for learner in learners:
                if learner.id not in existing_exam_log_learner_ids:
                    ExamLog.objects.create(
                        closed=True,
                        exam_id=serializer.instance.id,
                        user_id=learner.id,
                        completion_timestamp=serializer.instance.date_archived,
                        dataset_id=serializer.instance.dataset_id,
                    )


class ExamAssignmentViewset(viewsets.ModelViewSet):
    pagination_class = OptionalPageNumberPagination
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)

    def get_queryset(self):
        return models.ExamAssignment.objects.all()

    def get_serializer_class(self):
        if hasattr(self, "action") and self.action == "create":
            return serializers.ExamAssignmentCreationSerializer
        return serializers.ExamAssignmentRetrieveSerializer
