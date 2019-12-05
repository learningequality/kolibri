from rest_framework import viewsets

from .models import DynamicNetworkLocation
from .models import NetworkLocation
from .models import StaticNetworkLocation
from .serializers import NetworkLocationSerializer
from kolibri.core.content.permissions import CanManageContent


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = (CanManageContent,)
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()


class DynamicNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = DynamicNetworkLocation.objects.all()


class StaticNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = StaticNetworkLocation.objects.all()
