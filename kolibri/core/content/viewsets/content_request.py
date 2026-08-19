from django.db.models import Exists
from django.db.models import OuterRef
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from le_utils.constants.labels import learning_activities
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from kolibri.core.api import CreateModelMixin
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.tasks import automatic_resource_import
from kolibri.core.content.tasks import automatic_user_imported_resource_cleanup
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.utils.pagination import OptionalPageNumberPagination


class UUIDInFilter(BaseInFilter, UUIDFilter):
    pass


class ContentDownloadRequestMetadataSerializer(serializers.Serializer):
    title = serializers.CharField()
    file_size = serializers.IntegerField()
    learning_activities = serializers.ListField(
        child=serializers.ChoiceField(learning_activities.choices)
    )


class ContentDownloadRequestSerializer(KolibriModelSerializer):
    source_instance_id = serializers.UUIDField(
        required=False, allow_null=True, write_only=True
    )
    metadata = serializers.JSONField()

    class Meta:
        model = ContentDownloadRequest
        fields = (
            "id",
            "requested_at",
            "reason",
            "contentnode_id",
            "metadata",
            "status",
            "facility",
            "source_id",
            "source_instance_id",
        )
        read_only_fields = (
            "requested_at",
            "reason",
            "status",
            "facility",
            "source_id",
        )

    def validate_metadata(self, value):
        return ContentDownloadRequestMetadataSerializer().run_validation(value)

    def create(self, validated_data):
        # if there is an existing deletion request, delete the deletion request
        if "request" in self.context and self.context["request"].user is not None:
            user = self.context["request"].user
        else:
            raise serializers.ValidationError("User must be defined")

        deletion_request = ContentRemovalRequest.objects.filter(
            contentnode_id=validated_data["contentnode_id"],
            source_id=user.id,
            reason=ContentRequestReason.UserInitiated,
            source_model=FacilityUser.morango_model_name,
        )

        deletion_request.delete()

        existing_request = ContentDownloadRequest.objects.filter(
            contentnode_id=validated_data["contentnode_id"],
            source_id=user.id,
            reason=ContentRequestReason.UserInitiated,
            source_model=FacilityUser.morango_model_name,
        ).first()

        if existing_request:
            return existing_request

        content_request = ContentDownloadRequest.build_for_user(user)
        content_request.metadata = validated_data["metadata"]
        content_request.contentnode_id = validated_data["contentnode_id"]
        content_request.source_instance_id = validated_data.get("source_instance_id")

        content_request.save()
        automatic_resource_import.enqueue_if_not_active()
        return content_request


class ContentRequestFilter(FilterSet):
    contentnode_id = UUIDFilter()
    contentnode_id__in = UUIDInFilter(field_name="contentnode_id")

    class Meta:
        model = ContentDownloadRequest
        fields = ("contentnode_id", "contentnode_id__in")


class ContentRequestViewset(ReadOnlyValuesViewset, CreateModelMixin):
    serializer_class = ContentDownloadRequestSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = ContentRequestFilter
    pagination_class = OptionalPageNumberPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ContentDownloadRequest.objects.filter(
            source_id=self.request.user.id, reason=ContentRequestReason.UserInitiated
        )

    def annotate_queryset(self, queryset):
        # A sync-initiated removal must not hide a user-initiated download (#11426).
        # A failed removal took nothing away (#10574).
        return queryset.annotate(
            has_removal=Exists(
                ContentRemovalRequest.objects.filter(
                    source_model=OuterRef("source_model"),
                    source_id=OuterRef("source_id"),
                    contentnode_id=OuterRef("contentnode_id"),
                    requested_at__gte=OuterRef("requested_at"),
                    reason=OuterRef("reason"),
                ).exclude(status=ContentRequestStatus.Failed)
            )
        ).filter(has_removal=False)

    def delete(self, request, pk=None):
        request_id = pk

        if request_id is None:
            return Response(
                {"detail": "Request ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_download_request = (
            self.get_queryset()
            .filter(
                id=request_id,
            )
            .first()
        )

        if existing_download_request is None:
            return Response(
                {"detail": "No existing download request found"},
                status=status.HTTP_204_NO_CONTENT,
            )

        existing_deletion_request = ContentRemovalRequest.objects.filter(
            contentnode_id=existing_download_request.contentnode_id,
            reason=existing_download_request.reason,
            source_id=request.user.id,
        ).first()

        if existing_deletion_request:
            if existing_deletion_request.status == ContentRequestStatus.Failed:
                existing_deletion_request.status = ContentRequestStatus.Pending
                existing_deletion_request.save()
        else:
            content_request = ContentRemovalRequest.build_for_user(request.user)
            content_request.contentnode_id = existing_download_request.contentnode_id
            content_request.save()

        automatic_user_imported_resource_cleanup.enqueue_if_not()
        return Response(status=status.HTTP_204_NO_CONTENT)
