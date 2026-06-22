import logging

from django.core.exceptions import PermissionDenied
from django.core.validators import MinLengthValidator
from django.http import Http404
from django.http import HttpResponseBadRequest
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response

from kolibri.core import error_constants
from kolibri.core.api import ValuesMethodField
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.tasks import assign_picture_passwords_to_facility
from kolibri.core.auth.utils.picture_passwords import are_picture_passwords_exhausted
from kolibri.core.device.utils import allow_guest_access as _allow_guest_access
from kolibri.core.device.utils import (
    is_full_facility_import as _is_full_facility_import,
)
from kolibri.core.tasks.main import job_storage

from ..constants import collection_kinds
from ..errors import IncompatibleDeviceSettingError
from ..models import Facility
from ..models import FacilityDataset
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter

logger = logging.getLogger(__name__)


def validate_pin_code(value):
    if not value.isdigit():
        raise serializers.ValidationError("A Pin must be number")


class ExtraFieldsSerializer(serializers.Serializer):
    facility = serializers.JSONField(required=False)
    pin_code = serializers.CharField(
        required=False,
        max_length=4,
        validators=[MinLengthValidator(4), validate_pin_code],
    )
    on_my_own_setup = serializers.BooleanField(required=False)


class FacilityDatasetFilter(FilterSet):
    facility_id = UUIDFilter(field_name="collection")

    class Meta:
        model = FacilityDataset
        fields = ["facility_id"]


class FacilityDatasetSerializer(serializers.ModelSerializer):
    extra_fields = serializers.JSONField(required=False)
    picture_password_settings = serializers.JSONField(allow_null=True, required=False)
    allow_guest_access = ValuesMethodField(sources=())
    is_full_facility_import = ValuesMethodField(sources=("id",))

    def get_allow_guest_access(self, row):
        return _allow_guest_access()

    def get_is_full_facility_import(self, row):
        return _is_full_facility_import(row.id)

    class Meta:
        model = FacilityDataset
        fields = (
            "id",
            "learner_can_edit_username",
            "learner_can_edit_name",
            "learner_can_edit_password",
            "learner_can_sign_up",
            "learner_can_delete_account",
            "learner_can_login_with_no_password",
            "show_download_button_in_learn",
            "enable_mark_attendance",
            "extra_fields",
            "picture_password_settings",
            "description",
            "location",
            "registered",
            "preset",
            "allow_guest_access",
            "is_full_facility_import",
        )

    def validate(self, attrs):
        settings = attrs.get("picture_password_settings")
        if settings is not None:
            if not isinstance(settings, dict):
                raise serializers.ValidationError(
                    {"picture_password_settings": "Must be an object or null"}
                )
            if settings.get("icon_style") not in ("standard", "colorful"):
                raise serializers.ValidationError(
                    {
                        "picture_password_settings": "icon_style must be 'standard' or 'colorful'"
                    }
                )
            if not isinstance(settings.get("show_icon_text"), bool):
                raise serializers.ValidationError(
                    {"picture_password_settings": "show_icon_text must be a boolean"}
                )
        return attrs

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except IncompatibleDeviceSettingError as e:
            raise serializers.ValidationError(
                "Incompatible device setting",
                code=error_constants.INVALID,
            ) from e


class FacilityDatasetViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = FacilityDatasetFilter
    serializer_class = FacilityDatasetSerializer

    def get_queryset(self):
        return FacilityDataset.objects.filter(
            collection__kind=collection_kinds.FACILITY
        )

    @decorators.action(methods=["post"], detail=True)
    def resetsettings(self, request, pk):
        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            if not request.user.can_update(dataset):
                raise PermissionDenied("You cannot reset this facility's settings")
            dataset.reset_to_default_settings()
            data = FacilityDatasetSerializer(dataset).data
            return Response(data)
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility does not exist")

    @decorators.action(methods=["post", "patch"], detail=True, url_path="update-pin")
    def update_pin(self, request, pk):
        serializer = ExtraFieldsSerializer(data=request.data)
        if not serializer.is_valid():
            return HttpResponseBadRequest("Invalid pin input")

        pin_code = serializer.data.get("pin_code")
        if request.method == "POST" and not pin_code:
            return HttpResponseBadRequest("Please provide a pin")

        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            if dataset.extra_fields is None:
                dataset.extra_fields = {}
            dataset.extra_fields["pin_code"] = pin_code
            dataset.save()
            return Response(FacilityDatasetSerializer(dataset).data)
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility not found")

    @decorators.action(
        methods=["patch"],
        detail=True,
        url_path="save-facility-login-settings",
    )
    def save_facility_login_settings(self, request, pk):
        dataset = self.get_object()
        facility = Facility.objects.get(dataset_id=dataset.id)

        new_pps = request.data.get("picture_password_settings")
        learner_can_login_with_no_password = request.data.get(
            "learner_can_login_with_no_password"
        )
        learner_can_edit_password = request.data.get("learner_can_edit_password")

        currently_enabled = dataset.picture_password_settings is not None
        enabling = not currently_enabled and new_pps is not None

        if enabling:
            if are_picture_passwords_exhausted(dataset.id):
                return Response(
                    {"detail": "Picture passwords exhausted for this facility."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            dataset.picture_password_settings = new_pps
            dataset.learner_can_login_with_no_password = True
            dataset.learner_can_edit_password = False
            dataset.save()

            job, _ = assign_picture_passwords_to_facility.validate_job_data(
                request.user,
                data={"facility_id": facility.id},
            )
            job_id = assign_picture_passwords_to_facility.enqueue(job=job)
            enqueued_job = job_storage.get_job(job_id)
            return Response(
                {
                    "dataset": FacilityDatasetSerializer(dataset).data,
                    "task": {
                        "id": enqueued_job.job_id,
                        "status": enqueued_job.state,
                        "percentage": enqueued_job.percentage_progress,
                        "cancellable": enqueued_job.cancellable,
                        "facility_id": enqueued_job.facility_id,
                        "extra_metadata": enqueued_job.extra_metadata,
                    },
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if currently_enabled and new_pps is not None:
            dataset.picture_password_settings = new_pps
            dataset.save()
            return Response(
                {"dataset": FacilityDatasetSerializer(dataset).data},
                status=status.HTTP_200_OK,
            )

        if new_pps is None:
            dataset.picture_password_settings = None
            if learner_can_login_with_no_password:
                dataset.learner_can_login_with_no_password = True
                dataset.learner_can_edit_password = False
            else:
                dataset.learner_can_login_with_no_password = False
                if learner_can_edit_password is not None:
                    dataset.learner_can_edit_password = learner_can_edit_password
            dataset.save()
            return Response(
                {"dataset": FacilityDatasetSerializer(dataset).data},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST
        )
