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
        fields = ('id', 'available', 'base_url', 'nickname',)

    def validate_base_url(self, value):
        try:
            client = NetworkClient(address=value)
        except errors.NetworkError as e:
            raise ValidationError("Error with address {} ({})".format(value, e.__class__.__name__), code=e.code)
        return client.base_url

    def validate(self, data):
        if not data["nickname"]:
            client = NetworkClient(base_url=data["base_url"])
            data["nickname"] = client.get("/api/public/info/").json()["device_name"]
        return data
