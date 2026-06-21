from datetime import timedelta

from django.db.models import Exists
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models.expressions import Subquery
from django.db.models.query import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from morango.constants import transfer_statuses
from morango.models import TransferSession
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesMethodField
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.models import StatusSentiment
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.fields import DateTimeTzField
from kolibri.core.public.constants.user_sync_options import DELAYED_SYNC
from kolibri.core.public.constants.user_sync_statuses import INSUFFICIENT_STORAGE
from kolibri.core.public.constants.user_sync_statuses import NOT_RECENTLY_SYNCED
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import RECENTLY_SYNCED
from kolibri.core.public.constants.user_sync_statuses import SYNCING
from kolibri.core.public.constants.user_sync_statuses import UNABLE_TO_SYNC


class SyncStatusFilter(FilterSet):
    member_of = ModelChoiceFilter(
        method="filter_member_of", queryset=Collection.objects.all()
    )

    def filter_member_of(self, queryset, name, value):
        return queryset.filter(
            Q(user__memberships__collection=value) | Q(user__facility=value)
        )

    class Meta:
        model = UserSyncStatus
        fields = ["user", "member_of"]


sync_diff = timedelta(seconds=DELAYED_SYNC)


class UserSyncStatusSerializer(serializers.ModelSerializer):
    status = ValuesMethodField(
        sources=(
            "transfer_status",
            "device_status",
            "device_status_sentiment",
            "last_synced",
            "status",
        )
    )
    last_synced = serializers.DateTimeField(allow_null=True, read_only=True)
    device_status = serializers.CharField(allow_null=True, read_only=True)
    device_status_sentiment = serializers.IntegerField(allow_null=True, read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    has_downloads = serializers.BooleanField(read_only=True)
    last_download_removed = serializers.DateTimeField(allow_null=True, read_only=True)
    sync_downloads_in_progress = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSyncStatus
        fields = (
            "status",
            "last_synced",
            "device_status",
            "device_status_sentiment",
            "user",
            "has_downloads",
            "last_download_removed",
            "sync_downloads_in_progress",
        )

    def get_status(self, obj):
        transfer_status = obj.transfer_status
        device_status = obj.device_status
        device_status_sentiment = obj.device_status_sentiment
        last_synced = obj.last_synced
        recent = last_synced and (timezone.now() - last_synced < sync_diff)
        if transfer_status in transfer_statuses.IN_PROGRESS_STATES:
            return SYNCING
        elif transfer_status == transfer_statuses.ERRORED:
            return UNABLE_TO_SYNC
        elif recent:
            if device_status == DeviceStatus.InsufficientStorage[0]:
                return INSUFFICIENT_STORAGE
            elif (
                device_status is not None
                and device_status_sentiment == StatusSentiment.Negative
            ):
                return UNABLE_TO_SYNC
            return RECENTLY_SYNCED
        elif obj.status == SyncQueueStatus.Queued:
            return QUEUED
        return NOT_RECENTLY_SYNCED


class UserSyncStatusViewSet(ReadOnlyValuesViewset):
    permission_classes = (
        IsAuthenticated,
        KolibriAuthPermissions,
    )
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSyncStatus.objects.all()
    filterset_class = SyncStatusFilter

    serializer_class = UserSyncStatusSerializer

    def get_queryset(self):
        # If this is a subset of users device, we should just return no data
        # if there are no possible devices we could sync to.
        if (
            get_device_setting("subset_of_users_device")
            and not NetworkLocation.objects.filter(
                subset_of_users_device=False
            ).exists()
        ):
            return UserSyncStatus.objects.none()
        return UserSyncStatus.objects.all()

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(
            last_synced=F("sync_session__last_activity_timestamp"),
        )

        most_recent_sync_status = (
            TransferSession.objects.filter(
                sync_session=OuterRef("sync_session"), active=True
            )
            .values_list("transfer_stage_status", flat=True)
            .order_by("-last_activity_timestamp")[:1]
        )
        most_recent_synced_device_status = LearnerDeviceStatus.objects.filter(
            user_id=OuterRef("user_id"),
            instance_id=OuterRef("sync_session__client_instance_id"),
        )

        # Use the same condition used in the ContentRequest API endpoint
        # otherwise, this will signal that users have downloads
        # but when they navigate to the Downloads page, they may not see
        # any downloads.
        downloads_without_removals_queryset = ContentDownloadRequest.objects.annotate(
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

        has_download = Exists(
            downloads_without_removals_queryset.filter(
                source_id=OuterRef("user_id"),
                source_model=FacilityUser.morango_model_name,
                reason=ContentRequestReason.UserInitiated,
            )
        )

        has_in_progress_sync_initiated_download = Exists(
            downloads_without_removals_queryset.filter(
                source_id=OuterRef("user_id"),
                source_model=FacilityUser.morango_model_name,
                reason=ContentRequestReason.SyncInitiated,
            ).exclude(
                status__in=[ContentRequestStatus.Failed, ContentRequestStatus.Completed]
            )
        )

        last_download_removal = Subquery(
            ContentRemovalRequest.objects.filter(
                source_id=OuterRef("user_id"),
                source_model=FacilityUser.morango_model_name,
                reason=ContentRequestReason.SyncInitiated,
            )
            .annotate(last_removal=Max("requested_at"))
            .values("last_removal"),
            output_field=DateTimeTzField(),
        )
        queryset = queryset.annotate(
            transfer_status=Subquery(most_recent_sync_status),
            device_status=Subquery(
                most_recent_synced_device_status.values("status")[:1]
            ),
            device_status_sentiment=Subquery(
                most_recent_synced_device_status.values("status_sentiment")[:1]
            ),
            has_downloads=has_download,
            last_download_removed=last_download_removal,
            sync_downloads_in_progress=has_in_progress_sync_initiated_download,
        )
        return queryset
