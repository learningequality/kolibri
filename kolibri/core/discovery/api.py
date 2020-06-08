import requests
from rest_framework import viewsets
from rest_framework.response import Response

from .models import DynamicNetworkLocation
from .models import NetworkLocation
from .models import StaticNetworkLocation
from .serializers import NetworkLocationSerializer
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.device.permissions import NotProvisionedHasPermission


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent | NotProvisionedHasPermission]
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()


class DynamicNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = DynamicNetworkLocation.objects.all()


class StaticNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = StaticNetworkLocation.objects.all()


class NetworkLocationFacilitiesView(viewsets.GenericViewSet):
    """
    Given a NetworkLocation ID, returns a list of Facilities that are on
    that NetworkLocation, for the purposes of syncing
    """
    def retrieve(self, request, pk=None):
        base_url = 'http://192.168.1.8:8000/'
        facility_url = "{}api/public/v1/facility".format(base_url)
        response = requests.get(facility_url)
        response.raise_for_status()
        facilities_data = response.json()
        return Response(facilities_data)
