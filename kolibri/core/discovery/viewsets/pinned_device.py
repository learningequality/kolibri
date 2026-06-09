from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated

from kolibri.core.api import ValuesViewset
from kolibri.core.serializers import HexOnlyUUIDField

from ..models import PinnedDevice


class PinnedDeviceSerializer(serializers.ModelSerializer):
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
        return super().create(validated_data)


class PinnedDeviceViewSet(ValuesViewset):
    serializer_class = PinnedDeviceSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return PinnedDevice.objects.filter(user=self.request.user)
