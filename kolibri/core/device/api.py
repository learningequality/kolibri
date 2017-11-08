from kolibri.auth.api import KolibriAuthPermissions, KolibriAuthPermissionsFilter
from rest_framework import status, viewsets, mixins
from rest_framework.response import Response

from .models import DevicePermissions
from .permissions import NotProvisionedCanPost
from .serializers import DevicePermissionsSerializer, DeviceProvisionSerializer

from kolibri.utils.system import get_free_space
from kolibri.content.permissions import CanManageContent

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
