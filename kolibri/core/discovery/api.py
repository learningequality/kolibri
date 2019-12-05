from rest_framework import viewsets
from rest_framework.response import Response

from .models import NetworkLocation
from .serializers import NetworkLocationSerializer
from .utils.network.search import discovery_index
from .utils.network.search import get_peer_instance
from .utils.network.search import get_peer_instances


class DynamicNetworkLocationViewSet(viewsets.ViewSet):
    def list(self, request):
        return Response(get_peer_instances())

    def retrieve(self, request, pk=None):
        return Response(get_peer_instance(pk))


class StaticNetworkLocationViewSet(viewsets.ModelViewSet):
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()


class NetworkLocationViewSet(viewsets.ViewSet):
    def retrieve(self, request, pk=None):
        if pk in discovery_index:
            return Response(get_peer_instance(pk))
        else:
            view = StaticNetworkLocationViewSet.as_view({"get": "retrieve"})
            return view(request._request, pk=pk)
