from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import ValidationError

from .models import ConnectionStatus
from .models import PinnedDevice
from .models import StaticNetworkLocation
from .utils.network import errors
from .utils.network.client import NetworkClient
from kolibri.core.serializers import HexOnlyUUIDField


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
            client = NetworkClient.build_for_address(data["base_url"])
        except (errors.NetworkClientError, errors.URLParseError) as e:
            raise ValidationError(
                "Error with address {} ({})".format(
                    data["base_url"], e.__class__.__name__
                ),
                code=e.code,
            )
        data["base_url"] = client.base_url
        data["last_known_ip"] = client.remote_ip
        data["connection_status"] = ConnectionStatus.Okay
        info = {k: v for (k, v) in client.device_info.items() if v is not None}
        data.update(info)
        return super(NetworkLocationSerializer, self).validate(data)


class PinnedDeviceSerializer(ModelSerializer):
    """
    Serializer for handling requests regarding a user's Pinned Devices
    """

    instance_id = HexOnlyUUIDField()

    class Meta:
        model = PinnedDevice
        fields = ("instance_id", "id")

    def create(self, validated_data):
        if "request" in self.context and self.context["request"].user is not None:
            user = self.context["request"].user
        else:
            raise serializers.ValidationError("User must be defined")
        validated_data["user"] = user
        return super(PinnedDeviceSerializer, self).create(validated_data)
