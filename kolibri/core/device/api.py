import logging
from sys import version_info

from django.conf import settings
from django.contrib.auth import login
from django.core.exceptions import ValidationError
from django.http import Http404
from django.http import HttpResponseRedirect
from django.http.response import HttpResponseBadRequest
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import get_language
from morango.models import InstanceIDModel
from rest_framework import mixins
from rest_framework import views
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.views import APIView

import kolibri
from .models import DevicePermissions
from .models import DeviceSettings
from .permissions import UserHasAnyDevicePermissions
from .serializers import DevicePermissionsSerializer
from .serializers import DeviceSettingsSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import set_app_key_on_response
from kolibri.core.device.utils import using_metered_connection
from kolibri.core.device.utils import valid_app_key
from kolibri.core.utils.drf_utils import swagger_auto_schema_available
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.plugins.utils import PluginDoesNotExist
from kolibri.utils.android import ANDROID_PLATFORM_SYSTEM_VALUE
from kolibri.utils.android import on_android
from kolibri.utils.conf import OPTIONS
from kolibri.utils.filesystem import check_is_directory
from kolibri.utils.filesystem import get_path_permission
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
                "path": pathname,
            }
        )


class InitializeAppView(APIView):
    def get(self, request, token):
        if not valid_app_key(token):
            raise PermissionDenied("You have provided an invalid token")
        auth_token = request.GET.get("auth_token")
        if request.user.is_anonymous and device_provisioned() and auth_token:
            # If we are in app context, then login as the automatically created OS User
            try:
                user = FacilityUser.objects.get_or_create_os_user(auth_token)
                if user is not None:
                    login(request, user)
                else:
                    # If the user is not found, then we should not persist the auth_token
                    auth_token = None
            except ValidationError as e:
                logger.error(e)
        redirect_url = "/"
        next_url = request.GET.get("next")
        if next_url and url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            redirect_url = next_url
        response = HttpResponseRedirect(redirect_url)
        set_app_key_on_response(response, auth_token)
        return response


class CheckMeteredConnectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(using_metered_connection())
