import requests
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from .models import DynamicNetworkLocation
from .models import NetworkLocation
from .models import StaticNetworkLocation
from .permissions import NetworkLocationPermissions
from .serializers import NetworkLocationSerializer
from kolibri.core.device.permissions import NotProvisionedHasPermission


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [NetworkLocationPermissions | NotProvisionedHasPermission]
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        "subset_of_users_device",
    ]


class DynamicNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = DynamicNetworkLocation.objects.all()


class StaticNetworkLocationViewSet(NetworkLocationViewSet):
    queryset = StaticNetworkLocation.objects.all()


class NetworkLocationFacilitiesView(viewsets.GenericViewSet):
    permission_classes = [NetworkLocationPermissions | NotProvisionedHasPermission]

    def retrieve(self, request, pk=None):
        """
        Given a NetworkLocation ID, returns a list of Facilities that are on
        that NetworkLocation, for the purposes of syncing
        """

        # Step 1: Retrieve NetworkLocation Model and get base_url
        try:
            peer_device = NetworkLocation.objects.get(id=pk)
            base_url = peer_device.base_url

            # Step 2: Make request to the /facility endpoint
            response = requests.get("{}api/public/v1/facility".format(base_url))
            response.raise_for_status()
        except (Exception, NetworkLocation.DoesNotExist):
            raise NotFound()

        # Step 3: Respond with the list of facilities, and append device info
        # for convenience
        facilities = response.json()

        return Response(
            {
                "device_id": peer_device.id,
                "device_name": peer_device.nickname or peer_device.device_name,
                "device_address": base_url,
                "facilities": facilities,
            }
        )
