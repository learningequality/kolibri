from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from rest_framework import serializers
from rest_framework import viewsets

from kolibri.core.auth.models import Facility
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter

from ..models import GenerateCSVLogRequest


class GenerateCSVLogRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenerateCSVLogRequest
        fields = [
            "facility",
            "log_type",
            "selected_start_date",
            "selected_end_date",
            "date_requested",
        ]


class GenerateCSVLogRequestFilter(FilterSet):
    log_type = ChoiceFilter(choices=GenerateCSVLogRequest.LOG_TYPE_CHOICES)
    facility = ModelChoiceFilter(queryset=Facility.objects.all())

    class Meta:
        model = GenerateCSVLogRequest
        fields = ["log_type", "facility"]


class GenerateCSVLogRequestViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows csv log request data to be created or updated
    """

    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = GenerateCSVLogRequest.objects.all()
    serializer_class = GenerateCSVLogRequestSerializer
    filterset_class = GenerateCSVLogRequestFilter
