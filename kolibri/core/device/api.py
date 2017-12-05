import kolibri
from django.conf import settings
from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from kolibri.content.permissions import CanManageContent
from kolibri.utils.server import get_urls
from kolibri.utils.system import get_free_space
from kolibri.utils.time import local_now
from morango.models import InstanceIDModel
from rest_framework import mixins, status, views, viewsets
from rest_framework.response import Response

from .models import DevicePermissions
from .permissions import NotProvisionedCanPost, UserHasAnyDevicePermissions
from .serializers import DevicePermissionsSerializer, DeviceProvisionSerializer


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
        path = request.query_params.get('path')
        if path is None:
            free = get_free_space()
        else:
            free = get_free_space(path)

        return Response({"freespace": free})


class DeviceInfoView(views.APIView):

    permission_classes = (UserHasAnyDevicePermissions, )

    def get(self, request, format=None):
        info = {}

        info['version'] = kolibri.__version__

        status, urls = get_urls()
        if not urls:
            # Will not return anything when running the debug server, so at least return the current URL
            urls = [request.build_absolute_uri('/')]

        filtered_urls = [url for url in urls if '127.0.0.1' not in url and 'localhost' not in url]

        if filtered_urls:
            urls = filtered_urls

        info['urls'] = urls

        if settings.DATABASES['default']['ENGINE'].endswith('sqlite3'):
            # If any other database backend, will not be file backed, so no database path to return
            info['database_path'] = settings.DATABASES['default']['NAME']

        instance_model = InstanceIDModel.get_or_create_current_instance()[0]

        info['device_name'] = instance_model.hostname
        info['device_id'] = instance_model.id
        info['os'] = instance_model.platform

        info['content_storage_free_space'] = get_free_space()

        # This returns the localized time for the server
        info['server_time'] = local_now()
        # Returns the named timezone for the server (the time above only includes the offset)
        info['server_timezone'] = settings.TIME_ZONE

        return Response(info)
