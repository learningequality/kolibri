import logging

from django.db import transaction
from django.db.models import Func
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import TextField
from django.db.models import Value
from django.db.models.functions import Cast
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import TransferSession
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.exceptions import ParseError
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.query import SQCount
from kolibri.core.utils.serializer_introspection import ValuesMethodField

from ..constants import facility_presets
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter
from ..utils.picture_passwords import are_picture_passwords_exhausted
from ..utils.picture_passwords import get_learner_count
from .facility_dataset import FacilityDatasetSerializer

logger = logging.getLogger(__name__)


class FacilitySerializer(serializers.ModelSerializer):
    dataset = FacilityDatasetSerializer(read_only=True)
    num_classrooms = serializers.IntegerField(read_only=True)
    num_users = serializers.IntegerField(read_only=True)
    last_successful_sync = serializers.DateTimeField(
        read_only=True, allow_null=True, format=None
    )
    last_failed_sync = serializers.DateTimeField(
        read_only=True, allow_null=True, format=None
    )
    num_learners = ValuesMethodField(sources=("dataset.id",))
    picture_passwords_exhausted = ValuesMethodField(sources=("dataset.id",))

    def get_num_learners(self, obj):
        return get_learner_count(obj.dataset.id)

    def get_picture_passwords_exhausted(self, obj):
        return are_picture_passwords_exhausted(obj.dataset.id)

    class Meta:
        model = Facility
        extra_kwargs = {"id": {"read_only": True}}
        fields = (
            "id",
            "name",
            "dataset",
            "num_classrooms",
            "num_users",
            "last_successful_sync",
            "last_failed_sync",
            "num_learners",
            "picture_passwords_exhausted",
        )


class CreateFacilitySerializer(serializers.ModelSerializer):
    preset = serializers.ChoiceField(choices=facility_presets.choices)

    class Meta:
        model = Facility
        fields = ("id", "name", "preset")

    def create(self, validated_data):
        preset = validated_data.get("preset")
        name = validated_data.get("name")
        with transaction.atomic():
            try:
                facility_dataset = FacilityDataset.objects.create(preset=preset)
                facility = Facility.objects.create(name=name, dataset=facility_dataset)
                facility.dataset.reset_to_default_settings(preset)
            except Exception as e:
                logger.exception("Error occurred while creating facility")
                raise ParseError("Error occurred while creating facility") from e
        return facility


class PublicFacilitySerializer(serializers.ModelSerializer):
    learner_can_login_with_no_password = serializers.BooleanField(
        source="dataset.learner_can_login_with_no_password", read_only=True
    )
    learner_can_sign_up = serializers.BooleanField(
        source="dataset.learner_can_sign_up", read_only=True
    )
    on_my_own_setup = serializers.BooleanField(read_only=True)
    picture_password_settings = serializers.JSONField(
        source="dataset.picture_password_settings", read_only=True, allow_null=True
    )

    class Meta:
        model = Facility
        fields = (
            "id",
            "dataset",
            "name",
            "learner_can_login_with_no_password",
            "learner_can_sign_up",
            "on_my_own_setup",
            "picture_password_settings",
        )


class FacilityViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

    def annotate_queryset(self, queryset):
        # TransferSession.filter stores dataset IDs as 32-char hex without hyphens,
        # but casting a UUIDField to text produces a hyphenated UUID — strip them.
        transfer_session_dataset_filter = Func(
            Cast(OuterRef("dataset"), TextField()),
            Value("-"),
            Value(""),
            function="replace",
            output_field=TextField(),
        )

        return (
            queryset.annotate(
                num_users=SQCount(
                    FacilityUser.objects.filter(facility=OuterRef("id")), field="id"
                )
            )
            .annotate(
                num_classrooms=SQCount(
                    Classroom.objects.filter(parent=OuterRef("id")), field="id"
                )
            )
            .annotate(
                last_successful_sync=Subquery(
                    # Sync does pull then push; a completed push means the facility
                    # was fully synced. See also: morango sync protocol docs.
                    TransferSession.objects.filter(
                        push=True,
                        active=False,
                        transfer_stage=transfer_stages.CLEANUP,
                        transfer_stage_status=transfer_statuses.COMPLETED,
                        filter=transfer_session_dataset_filter,
                    )
                    .order_by("-last_activity_timestamp")
                    .values("last_activity_timestamp")[:1]
                )
            )
            .annotate(
                last_failed_sync=Subquery(
                    TransferSession.objects.filter(
                        transfer_stage_status=transfer_statuses.ERRORED,
                        filter=transfer_session_dataset_filter,
                    )
                    .order_by("-last_activity_timestamp")
                    .values("last_activity_timestamp")[:1]
                )
            )
        )

    @decorators.action(methods=["post"], detail=False, permission_classes=[IsSuperuser])
    def create_facility(self, request):
        serializer = CreateFacilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response()


class PublicFacilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Facility.objects.select_related("dataset").all()
    serializer_class = PublicFacilitySerializer
