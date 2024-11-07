import logging
from datetime import timedelta
from sys import version_info

from django.conf import settings
from django.contrib.auth import login
from django.db.models import Exists
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models.expressions import Subquery
from django.db.models.query import Q
from django.http import Http404
from django.http.response import HttpResponseBadRequest
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.translation import get_language
from django.views.decorators.csrf import csrf_protect
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from morango.constants import transfer_statuses
from morango.models import InstanceIDModel
from morango.models import TransferSession
from rest_framework import mixins
from rest_framework import status
from rest_framework import views
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import Serializer

import kolibri
from .models import DevicePermissions
from .models import DeviceSettings
from .models import DeviceStatus
from .models import LearnerDeviceStatus
from .models import StatusSentiment
from .models import UserSyncStatus
from .permissions import NotProvisionedCanPost
from .permissions import UserHasAnyDevicePermissions
from .serializers import DevicePermissionsSerializer
from .serializers import DeviceProvisionSerializer
from .serializers import DeviceSettingsSerializer
from kolibri.core.analytics.tasks import schedule_ping
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.permissions import IsSuperuser
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
from kolibri.core.utils.drf_utils import swagger_auto_schema_available
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.plugins.utils import PluginDoesNotExist
from kolibri.utils.android import ANDROID_PLATFORM_SYSTEM_VALUE
from kolibri.utils.android import on_android
from kolibri.utils.conf import OPTIONS
from kolibri.utils.filesystem import check_is_directory
from kolibri.utils.filesystem import get_path_permission
from kolibri.utils.filesystem import resolve_path
from kolibri.utils.server import get_status_from_pid_file
from kolibri.utils.server import get_urls
from kolibri.utils.server import installation_type
from kolibri.utils.server import restart
from kolibri.utils.server import STATUS_RUNNING
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now


logger = logging.getLogger(__name__)


class DevicePermissionsViewSet(viewsets.ModelViewSet):
    queryset = DevicePermissions.objects.all()
    serializer_class = DevicePermissionsSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)


@method_decorator(csrf_protect, name="dispatch")
class DeviceProvisionView(viewsets.GenericViewSet):
    permission_classes = (NotProvisionedCanPost,)
    serializer_class = DeviceProvisionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        if data["superuser"]:
            login(request, data["superuser"])
        output_serializer = self.get_serializer(data)
        response_data = output_serializer.data

        # Restart zeroconf before moving along when we're a SoUD
        if response_data["is_soud"]:
            logger.info("Updating our Kolibri instance on the Zeroconf network now")
            from kolibri.utils.server import update_zeroconf_broadcast

            update_zeroconf_broadcast()

        schedule_ping()  # Trigger telemetry pingback after we've provisioned
        return Response(response_data, status=status.HTTP_201_CREATED)


class FreeSpaceView(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return Serializer

    def get_queryset(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return None

    def list(self, request):
        path = request.query_params.get("path")
        if path != "Content":
            return HttpResponseBadRequest("Invalid path")
        free = get_free_space(OPTIONS["Paths"]["CONTENT_DIR"])

        return Response({"freespace": free})


class DeviceInfoView(views.APIView):

    permission_classes = (UserHasAnyDevicePermissions,)

    def get(self, request, format=None):
        info = {}

        info["version"] = kolibri.__version__

        status, urls = get_urls()
        if not urls:
            # Will not return anything when running the debug server, so at least return the current URL
            urls = [
                request.build_absolute_uri(OPTIONS["Deployment"]["URL_PATH_PREFIX"])
            ]

        filtered_urls = [
            url for url in urls if "127.0.0.1" not in url and "localhost" not in url
        ]

        if filtered_urls:
            urls = filtered_urls

        info["urls"] = urls

        db_engine = settings.DATABASES["default"]["ENGINE"]

        if db_engine.endswith("sqlite3"):
            # Return path to .sqlite file (usually in KOLIBRI_HOME folder)
            info["database_path"] = settings.DATABASES["default"]["NAME"]
        elif db_engine.endswith("postgresql"):
            info["database_path"] = "postgresql"
        else:
            info["database_path"] = "unknown"

        instance_model = InstanceIDModel.get_or_create_current_instance()[0]

        info["device_id"] = instance_model.id
        info["os"] = (
            ANDROID_PLATFORM_SYSTEM_VALUE if on_android() else instance_model.platform
        )

        info["content_storage_free_space"] = get_free_space(
            OPTIONS["Paths"]["CONTENT_DIR"]
        )

        # This returns the localized time for the server
        info["server_time"] = local_now()
        # Returns the named timezone for the server (the time above only includes the offset)
        info["server_timezone"] = settings.TIME_ZONE
        info["installer"] = installation_type()
        info["python_version"] = "{major}.{minor}.{micro}".format(
            major=version_info.major, minor=version_info.minor, micro=version_info.micro
        )

        if not request.user.is_superuser:
            # If user is not superuser, return just free space available and kolibri version
            keys_to_remove = [
                "urls",
                "database_path",
                "device_id",
                "os",
                "server_time",
                "server_timezone",
                "installer",
                "python_version",
            ]
            for key in keys_to_remove:
                del info[key]

        return Response(info)


class DeviceSettingsView(views.APIView):

    permission_classes = (UserHasAnyDevicePermissions,)

    def get(self, request):
        settings = DeviceSettings.objects.get()
        return Response(DeviceSettingsSerializer(settings).data)

    def patch(self, request):
        settings = DeviceSettings.objects.get()

        serializer = DeviceSettingsSerializer(settings, data=request.data)

        if not serializer.is_valid():
            return HttpResponseBadRequest(serializer.errors)

        serializer.save()
        return Response(serializer.data)


class DeviceNameView(views.APIView):
    permission_classes = (UserHasAnyDevicePermissions,)

    def get(self, request):
        settings = DeviceSettings.objects.get()
        return Response({"name": settings.name})

    def patch(self, request):
        settings = DeviceSettings.objects.get()
        settings.name = request.data["name"]
        settings.save()
        return Response({"name": settings.name})


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


def map_status(record):
    """
    Summarize the current state of the sync into a constant for use by
    the frontend.
    """
    transfer_status = record.pop("transfer_status", None)
    device_status = record.get("device_status")
    device_status_sentiment = record.get("device_status_sentiment")
    sync_status = record.pop("status", None)
    recent = record["last_synced"] and (
        timezone.now() - record["last_synced"] < sync_diff
    )
    if transfer_status in transfer_statuses.IN_PROGRESS_STATES:
        return SYNCING
    elif transfer_status == transfer_statuses.ERRORED:
        return UNABLE_TO_SYNC
    elif recent:
        # when recent sync was successful, check device status
        if device_status == DeviceStatus.InsufficientStorage[0]:
            return INSUFFICIENT_STORAGE
        # if we receive unknown status, show error if sentiment is negative
        elif (
            device_status is not None
            and device_status_sentiment == StatusSentiment.Negative
        ):
            return UNABLE_TO_SYNC
        return RECENTLY_SYNCED
    elif sync_status == SyncQueueStatus.Queued:
        return QUEUED
    return NOT_RECENTLY_SYNCED


class UserSyncStatusViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSyncStatus.objects.all()
    filterset_class = SyncStatusFilter

    values = (
        "status",
        "last_synced",
        "transfer_status",
        "device_status",
        "device_status_sentiment",
        "user",
        "has_downloads",
        "last_download_removed",
        "sync_downloads_in_progress",
    )

    field_map = {
        "status": map_status,
    }

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


class PluginsViewSet(viewsets.ViewSet):
    permission_classes = (IsSuperuser,)

    def _get_plugin(self, plugin_name):
        return initialize_kolibri_plugin(plugin_name)

    def _plugin_name_from_pk(self, pk):
        return pk.replace("*", ".")

    def _serialize(self, plugin):
        return {
            "name": plugin.name(get_language()),
            "id": plugin.module_path.replace(".", "*"),
            "enabled": plugin.enabled,
        }

    def list(self, request):
        plugins = []
        for plugin in iterate_plugins():
            if plugin.can_manage_while_running:
                plugins.append(self._serialize(plugin))

        return Response(plugins)

    def _retrieve_plugin(self, pk):
        if not pk:
            raise Http404
        try:
            plugin = self._get_plugin(pk.replace("*", "."))
            if not plugin.can_manage_while_running:
                raise Http404
            return plugin
        except PluginDoesNotExist:
            raise Http404

    def retrieve(self, request, pk):
        return Response(self._serialize(self._retrieve_plugin(pk)))

    def partial_update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        plugin = self._retrieve_plugin(pk)
        enabled = request.data.get("enabled", None)
        if enabled is not None:
            if enabled and not plugin.enabled:
                plugin.enable()
            elif not enabled and plugin.enabled:
                plugin.disable()
        return Response(self._serialize(plugin))


class DeviceRestartView(views.APIView):

    permission_classes = (IsSuperuser,)

    def get(self, request):
        status = get_status_from_pid_file()
        return Response(status)

    def post(self, request):
        status = get_status_from_pid_file()
        if status == STATUS_RUNNING:
            restarted = restart()
        if restarted:
            return Response(status)
        return HttpResponseBadRequest(status)


class DriveInfoViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    def list(self, request):
        drives = get_mounted_drives_with_channel_info()
        return Response([mountdata._asdict() for mountdata in drives])

    def retrieve(self, request, pk):
        return Response(get_mounted_drive_by_id(pk)._asdict())


class PathPermissionView(views.APIView):

    permission_classes = (UserHasAnyDevicePermissions,)

    @swagger_auto_schema_available(
        [("path", "path to check permissions for", "string")]
    )
    def get(self, request):
        pathname = request.query_params.get("path", OPTIONS["Paths"]["CONTENT_DIR"])
        return Response(
            {
                "writable": get_path_permission(pathname),
                "directory": check_is_directory(pathname),
                "path": resolve_path(pathname),
            }
        )
