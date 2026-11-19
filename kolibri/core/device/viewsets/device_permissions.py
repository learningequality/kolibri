from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.validators import UniqueValidator

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.device.models import DevicePermissions


class DevicePermissionsSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all(),
        validators=[
            UniqueValidator(
                queryset=DevicePermissions.objects.all(),
                message="This user already has device permissions.",
            )
        ],
    )

    class Meta:
        model = DevicePermissions
        fields = ("user", "is_superuser", "can_manage_content")


class DevicePermissionsViewSet(viewsets.ModelViewSet):
    queryset = DevicePermissions.objects.all()
    serializer_class = DevicePermissionsSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
