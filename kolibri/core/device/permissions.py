from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import DenyAll


class NotProvisionedCanPost(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned

        return not device_provisioned() and request.method == "POST"


class UserHasAnyDevicePermissions(DenyAll):
    def has_permission(self, request, view):
        from .models import device_permissions_fields

        return any(getattr(request.user, field) for field in device_permissions_fields)
