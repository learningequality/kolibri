from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from .models import DynamicNetworkLocation
from .models import NetworkLocation
from .models import StaticNetworkLocation
from .permissions import NetworkLocationPermissions
from .serializers import NetworkLocationSerializer
from .utils.network import errors
from .utils.network.client import NetworkClient
from .utils.network.connections import capture_connection_state
from .utils.network.connections import update_network_location
from kolibri.core.device.permissions import NotProvisionedHasPermission


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [NetworkLocationPermissions | NotProvisionedHasPermission]
    serializer_class = NetworkLocationSerializer
    queryset = NetworkLocation.objects.all()
    filter_backends = [DjangoFilterBackend]
    filter_fields = [
        "subset_of_users_device",
    ]

    @decorators.action(methods=("post",), detail=True)
    def update_connection_status(self, request, pk=None):
        network_location = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            update_network_location(network_location)
        except errors.NetworkClientError:
            pass
        serializer = self.get_serializer(network_location)
        return Response(serializer.data)


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
        facilities = []
        try:
            peer_device = NetworkLocation.objects.get(id=pk)
            with capture_connection_state(peer_device):
                with NetworkClient.build_from_network_location(peer_device) as client:
                    base_url = client.base_url
                    # Step 2: Make request to the /facility endpoint
                    response = client.get("api/public/v1/facility")
                    facilities = response.json()
        except (errors.NetworkClientError, NetworkLocation.DoesNotExist):
            raise NotFound()

        # Step 3: Respond with the list of facilities, and append device info
        # for convenience
        return Response(
            {
                "device_id": peer_device.id,
                "device_name": peer_device.nickname or peer_device.device_name,
                "device_address": base_url,
                "facilities": facilities,
            }
        )
