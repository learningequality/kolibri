from rest_framework import viewsets
from rest_framework.response import Response

from .models import DynamicNetworkLocation
from .models import NetworkLocation
from .models import StaticNetworkLocation
from .serializers import NetworkLocationSerializer
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.discovery.utils.network.search import run_peer_discovery


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects


class DynamicNetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = DynamicNetworkLocation.objects

    def list(self, request):
        run_peer_discovery()
        serializer = self.serializer_class(self.queryset, many=True)
        return Response(serializer.data)


class StaticNetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = StaticNetworkLocation.objects
