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
        )

    def validate_base_url(self, value):
        try:
            client = NetworkClient(address=value)
        except errors.NetworkError as e:
            raise ValidationError(
                "Error with address {} ({})".format(value, e.__class__.__name__),
                code=e.code,
            )
        return client.base_url
