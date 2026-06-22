from rest_framework import serializers
from rest_framework import viewsets

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.device.models import DevicePermissions


class DevicePermissionsSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=FacilityUser.objects.all())

    class Meta:
        model = DevicePermissions
        fields = ("user", "is_superuser", "can_manage_content")


class DevicePermissionsViewSet(viewsets.ModelViewSet):
    queryset = DevicePermissions.objects.all()
    serializer_class = DevicePermissionsSerializer
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
