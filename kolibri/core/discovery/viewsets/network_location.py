from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from kolibri.core.api import BaseValuesViewset
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.discovery.well_known import DATA_PORTAL_BASE_INSTANCE_ID
from kolibri.core.utils.urls import reverse_path

from ..models import ConnectionStatus
from ..models import DynamicNetworkLocation
from ..models import LocationTypes
from ..models import NetworkLocation
from ..models import StaticNetworkLocation
from ..utils.network import errors
from ..utils.network.client import NetworkClient
from ..utils.network.connections import capture_connection_state
from ..utils.network.connections import update_network_location


class NetworkLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaticNetworkLocation
        fields = (
            "id",
            "available",
            "nickname",
            "base_url",
            "device_name",
            "instance_id",
            "added",
            "last_accessed",
            "since_last_accessed",
            "operating_system",
            "application",
            "kolibri_version",
            "subset_of_users_device",
            "connection_status",
            "is_local",
            "location_type",
        )
        read_only_fields = (
            "available",
            "device_name",
            "instance_id",
            "added",
            "last_accessed",
            "since_last_accessed",
            "operating_system",
            "application",
            "kolibri_version",
            "subset_of_users_device",
            "connection_status",
            "is_local",
            "location_type",
        )

    def validate(self, data):
        try:
            client = NetworkClient.discover_from_address(data["base_url"])
        except (errors.NetworkClientError, errors.URLParseError) as e:
            raise serializers.ValidationError(
                "Error with address {} ({})".format(
                    data["base_url"], e.__class__.__name__
                ),
                code=e.code,
            )
        data["base_url"] = client.base_url
        data["last_known_ip"] = client.remote_ip
        data["connection_status"] = ConnectionStatus.Okay
        # Filter out None values so they don't overwrite existing valid model
        # data — device_info may omit unknown fields as None (commit 7c63b8d)
        info = {k: v for (k, v) in client.device_info.items() if v is not None}
        data.update(info)
        return super().validate(data)


class NetworkLocationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated | NotProvisionedHasPermission]
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
        # Swallow NetworkClientError: capture_connection_state updates the
        # status even on failure, so we always return current state (commit
        # 7c63b8d — "Refine network device selection")
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


class _RemoteFacilityPicturePasswordSerializer(serializers.Serializer):
    icon_style = serializers.ChoiceField(choices=["standard", "colorful"])
    show_icon_text = serializers.BooleanField()


class _RemoteFacilitySerializer(serializers.Serializer):
    id = serializers.UUIDField(format="hex")
    dataset = serializers.UUIDField(format="hex")
    name = serializers.CharField()
    learner_can_login_with_no_password = serializers.BooleanField()
    learner_can_sign_up = serializers.BooleanField()
    on_my_own_setup = serializers.BooleanField()
    picture_password_settings = _RemoteFacilityPicturePasswordSerializer(
        allow_null=True
    )


class NetworkLocationFacilitiesView(BaseValuesViewset):
    queryset = NetworkLocation.objects.all()
    permission_classes = [IsAuthenticated | NotProvisionedHasPermission]
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
                    serializer = _RemoteFacilitySerializer(
                        data=response.json(), many=True
                    )
                    facilities = serializer.data if serializer.is_valid() else []
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
