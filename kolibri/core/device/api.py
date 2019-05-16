from django.conf import settings
from django.http.response import HttpResponseBadRequest
from django.utils.decorators import method_decorator
from django.utils.translation import check_for_language
from morango.models import InstanceIDModel
from rest_framework import mixins
from rest_framework import status
from rest_framework import views
from rest_framework import viewsets
from rest_framework.response import Response

import kolibri
from .models import DevicePermissions
from .models import DeviceSettings
from .permissions import NotProvisionedCanPost
from .permissions import UserHasAnyDevicePermissions
from .serializers import DevicePermissionsSerializer
from .serializers import DeviceProvisionSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.decorators import signin_redirect_exempt
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import get_urls
from kolibri.utils.server import installation_type
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now


class DevicePermissionsViewSet(viewsets.ModelViewSet):
    queryset = DevicePermissions.objects.all()
    serializer_class = DevicePermissionsSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)


@method_decorator(signin_redirect_exempt, name="dispatch")
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

        if settings.DATABASES["default"]["ENGINE"].endswith("sqlite3"):
            # If any other database backend, will not be file backed, so no database path to return
            info["database_path"] = settings.DATABASES["default"]["NAME"]

        instance_model = InstanceIDModel.get_or_create_current_instance()[0]

        info["device_name"] = instance_model.hostname
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

        return Response(info)


class DeviceLanguageSettingViewset(views.APIView):

    permission_classes = (UserHasAnyDevicePermissions,)

    def get(self, request):
        settings = DeviceSettings.objects.get()
        return Response({"language_id": settings.language_id})

    def patch(self, request):
        settings = DeviceSettings.objects.get()

        try:
            request_lang = request.data.get("language_id", "")
        except AttributeError:
            return HttpResponseBadRequest(
                'Value must be a JSON object with "language_id" field: {}'.format(
                    request.data
                )
            )

        if request_lang == "":
            return HttpResponseBadRequest('"language_id" is required')

        if request_lang is None or check_for_language(request_lang):
            settings.language_id = request_lang
            settings.save()
            return self.get(request)
        else:
            return HttpResponseBadRequest("Unknown language: {}".format(request_lang))
