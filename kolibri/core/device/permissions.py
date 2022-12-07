from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import DenyAll


class NotProvisionedCanPost(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned

        return not device_provisioned() and request.method == "POST"


class NotProvisionedHasPermission(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned

        if device_provisioned():
            return False
        return (
            request.method == "GET"
            or request.method == "POST"
            or request.method == "DELETE"
        )


class UserHasAnyDevicePermissions(DenyAll):
    def has_permission(self, request, view):
        from .models import device_permissions_fields

        return any(getattr(request.user, field) for field in device_permissions_fields)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsSuperuser(DenyAll):
    def has_permission(self, request, view):
        return request.user.is_superuser


class IsNotAnonymous(DenyAll):
    def has_permission(self, request, view):
        return request.user.is_authenticated
