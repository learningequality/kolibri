from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import DenyAll


class NotProvisionedCanPost(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned

        return not device_provisioned() and request.method == "POST"


class NotProvisionedCanGet(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned

        return not device_provisioned() and request.method == "GET"

    def has_object_permission(self, request, view, object):
        from .utils import device_provisioned

        return not device_provisioned() and request.method == "GET"


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


class IsSuperuser(DenyAll):
    def has_permission(self, request, view):
        return request.user.is_superuser


class LODUserHasSyncPermissions(BasePermission):
    """
    When a subset_of_users_device is provisioned, after the first user has been synced,
    this user must be able to sync more users
    """

    def has_permission(self, request, view):
        from .utils import get_device_setting

        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        return (request.user.is_anonymous() is False) and subset_of_users_device
