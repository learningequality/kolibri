from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DynamicNetworkLocation
from .models import LocationTypes
from .models import NetworkLocation
from .models import PinnedDevice
from .models import StaticNetworkLocation
from .permissions import NetworkLocationPermissions
from .serializers import NetworkLocationSerializer
from .serializers import PinnedDeviceSerializer
from .utils.network import errors
from .utils.network.client import NetworkClient
from .utils.network.connections import capture_connection_state
from .utils.network.connections import update_network_location
from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ValuesViewset
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import DATA_PORTAL_BASE_INSTANCE_ID
from kolibri.core.utils.urls import reverse_path


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [NetworkLocationPermissions | NotProvisionedHasPermission]
    serializer_class = NetworkLocationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        "id",
        "subset_of_users_device",
        "instance_id",
    ]

    def get_queryset(self):
        syncable = self.request.query_params.get("syncable", None)
        base_queryset = NetworkLocation.objects.filter(
            location_type__in=[LocationTypes.Static, LocationTypes.Dynamic]
        )
        reserved_ids = []
        if syncable == "1":
            # Include KDP's reserved location
            reserved_ids.append(DATA_PORTAL_BASE_INSTANCE_ID)
        elif syncable == "0":
            # Include Studio's reserved location
            reserved_ids.append(CENTRAL_CONTENT_BASE_INSTANCE_ID)
        if reserved_ids:
            reserved_queryset = NetworkLocation.objects.filter(
                id__in=reserved_ids,
            )
            return base_queryset | reserved_queryset
        return base_queryset

    def get_object(self, id_filter=None):
        """
        Override get_object to use the unrestricted queryset for the detail view
        """
        queryset = self.filter_queryset(NetworkLocation.objects.all())

        if not id_filter:
            id_filter = self.kwargs["pk"]

        # allow detail lookup by id or instance_id
        for filter_key in ("id", "instance_id"):
            try:
                obj = queryset.get(**{filter_key: id_filter})
                break
            except NetworkLocation.DoesNotExist:
                pass
        else:
            raise NotFound()

        self.check_object_permissions(self.request, obj)
        return obj

    @decorators.action(methods=("post",), detail=True)
    def update_connection_status(self, request, pk=None):
        network_location = self.get_object(id_filter=pk)
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


class NetworkLocationFacilitiesView(BaseValuesViewset):
    queryset = NetworkLocation.objects.all()
    permission_classes = [NetworkLocationPermissions | NotProvisionedHasPermission]
    values = ("device_id", "instance_id", "device_name", "device_address", "facilities")

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
                    response = client.get(
                        reverse_path("kolibri:core:publicfacility-list")
                    )
                    facilities = response.json()
        except (errors.NetworkClientError, NetworkLocation.DoesNotExist):
            raise NotFound()

        # Step 3: Respond with the list of facilities, and append device info
        # for convenience
        return Response(
            {
                "device_id": peer_device.id,
                "instance_id": peer_device.instance_id,
                "device_name": peer_device.nickname or peer_device.device_name,
                "device_address": base_url,
                "facilities": facilities,
            }
        )


class PinnedDeviceViewSet(ValuesViewset):
    values = ("instance_id", "id")
    serializer_class = PinnedDeviceSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return PinnedDevice.objects.filter(user=self.request.user)
