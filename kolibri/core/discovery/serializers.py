from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import ValidationError

from .models import ConnectionStatus
from .models import NetworkLocation
from .models import PinnedDevice
from .utils.network import errors
from .utils.network.client import NetworkClient


class NetworkLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkLocation
        fields = (
            "id",
            "available",
            "dynamic",
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
        )
        read_only_fields = (
            "available",
            "dynamic",
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
        )

    def validate(self, data):
        try:
            client = NetworkClient.build_for_address(data["base_url"])
        except errors.NetworkClientError as e:
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
    class Meta:
        model = PinnedDevice
        fields = (
            "device_id",
            "user",
        )
