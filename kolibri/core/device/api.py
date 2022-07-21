from datetime import timedelta
from sys import version_info

import requests
from django.conf import settings
from django.core.urlresolvers import reverse
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models.expressions import Subquery
from django.db.models.query import Q
from django.http import Http404
from django.http.response import HttpResponseBadRequest
from django.utils import timezone
from django.utils.translation import get_language
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
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from six.moves.urllib.parse import urljoin

import kolibri
from .models import DevicePermissions
from .models import DeviceSettings
from .models import UserSyncStatus
from .permissions import NotProvisionedCanPost
from .permissions import UserHasAnyDevicePermissions
from .serializers import DevicePermissionsSerializer
from .serializers import DeviceProvisionSerializer
from .serializers import DeviceSettingsSerializer
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import Collection
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.core.device.permissions import IsNotAnonymous
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.public.constants.user_sync_options import DELAYED_SYNC
from kolibri.core.public.constants.user_sync_statuses import NOT_RECENTLY_SYNCED
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import RECENTLY_SYNCED
from kolibri.core.public.constants.user_sync_statuses import SYNCING
from kolibri.core.public.constants.user_sync_statuses import UNABLE_TO_SYNC
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.plugins.utils import PluginDoesNotExist
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import get_status_from_pid_file
from kolibri.utils.server import get_urls
from kolibri.utils.server import installation_type
from kolibri.utils.server import restart
from kolibri.utils.server import STATUS_RUNNING
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now


class DevicePermissionsViewSet(viewsets.ModelViewSet):
    queryset = DevicePermissions.objects.all()
    serializer_class = DevicePermissionsSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)


class DeviceProvisionView(viewsets.GenericViewSet):
    permission_classes = (NotProvisionedCanPost,)
    serializer_class = DeviceProvisionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        output_serializer = self.get_serializer(data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class FreeSpaceView(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = (CanManageContent,)

    def list(self, request):
        path = request.query_params.get("path")
        if path is None:
            free = get_free_space()
        elif path == "Content":
            free = get_free_space(OPTIONS["Paths"]["CONTENT_DIR"])
        else:
            free = get_free_space(path)

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
        info["os"] = instance_model.platform

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


def map_status(status):
    """
    Summarize the current state of the sync into a constant for use by
    the frontend.
    """
    transfer_status = status.pop("transfer_status", None)
    queued = status.pop("queued", None)
    recent = status["last_synced"] and (
        timezone.now() - status["last_synced"] < sync_diff
    )
    if (
        transfer_status == transfer_statuses.STARTED
        or transfer_status == transfer_statuses.PENDING
    ):
        return SYNCING
    elif transfer_status == transfer_statuses.ERRORED:
        return UNABLE_TO_SYNC
    elif recent:
        return RECENTLY_SYNCED
    elif queued:
        return QUEUED
    elif status["last_synced"] and not recent:
        return NOT_RECENTLY_SYNCED


class UserSyncStatusViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSyncStatus.objects.all()
    filter_class = SyncStatusFilter

    values = (
        "queued",
        "last_synced",
        "transfer_status",
        "user",
    )

    field_map = {
        "status": map_status,
    }

    def get_queryset(self):
        # If this is a subset of users device, we should just return no data
        # if there are no possible devices we could sync to.
        if (
            get_device_setting("subset_of_users_device", False)
            and not DynamicNetworkLocation.objects.filter(
                subset_of_users_device=False
            ).exists()
        ):
            return UserSyncStatus.objects.none()
        return UserSyncStatus.objects.all()

    def annotate_queryset(self, queryset):

        queryset = queryset.annotate(
            last_synced=Max("sync_session__last_activity_timestamp")
        )

        most_recent_active_transfer_session_status = (
            TransferSession.objects.filter(
                sync_session=OuterRef("sync_session"), active=True
            )
            .values_list("transfer_stage_status", flat=True)
            .order_by("-last_activity_timestamp")[:1]
        )

        queryset = queryset.annotate(
            transfer_status=Subquery(most_recent_active_transfer_session_status)
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


class RemoteFacilitiesViewset(views.APIView):
    """
    Api to retrieve facilities information from a remote device
    :param str baseurl: url of the server, including port to connect
    :return : json object containing the list of facilities of the device, with their id, name, learner_can_sign_up and learner_can_login_with_no_password info
    """

    permission_classes = (IsNotAnonymous,)

    def get(self, request):
        baseurl = request.query_params.get("baseurl", request.build_absolute_uri("/"))
        path = reverse("kolibri:core:publicfacility-list").lstrip("/")
        url = urljoin(baseurl, path)
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response({})
        except Exception as e:
            raise ValidationError(detail=str(e))
