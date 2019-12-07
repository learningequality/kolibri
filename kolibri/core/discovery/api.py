from rest_framework import viewsets
from rest_framework.response import Response

from .models import NetworkLocation
from .serializers import NetworkLocationSerializer
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.device.permissions import UserHasAnyDevicePermissions
from kolibri.core.discovery.utils.network.search import get_available_instances


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()


class NetworkSearchViewSet(viewsets.ViewSet):
    permission_classes = (UserHasAnyDevicePermissions,)

    def list(self, request):
        return Response(get_available_instances())
