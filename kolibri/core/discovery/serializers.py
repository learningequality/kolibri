from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework.serializers import ValidationError

from .models import NetworkLocation
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
            "operating_system",
            "application",
            "kolibri_version",
            "subset_of_users_device",
        )
        read_only_fields = (
            "available",
            "dynamic",
            "device_name",
            "instance_id",
            "added",
            "last_accessed",
            "operating_system",
            "application",
            "kolibri_version",
            "subset_of_users_device",
        )

    def validate(self, data):
        try:
            client = NetworkClient(address=data["base_url"])
        except errors.NetworkError as e:
            raise ValidationError(
                "Error with address {} ({})".format(
                    data["base_url"], e.__class__.__name__
                ),
                code=e.code,
            )
        data["base_url"] = client.base_url
        info = {k: v for (k, v) in client.info.items() if v is not None}
        data.update(info)
        return super(NetworkLocationSerializer, self).validate(data)
