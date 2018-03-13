from kolibri.auth.permissions.general import DenyAll
from rest_framework.permissions import BasePermission


class UserCanManageDevicePermissions(DenyAll):

    def user_can_read_object(self, user, obj):
        return user.is_superuser

    def readable_by_user_filter(self, user, queryset):
        if user.is_superuser:
            return queryset
        return queryset.none()

    def user_can_create_object(self, user, obj):
        return user.is_superuser

    def user_can_update_object(self, user, obj):
        # Superuser cannot commit superuser-suicide
        return user.is_superuser and obj.user != user

    def user_can_delete_object(self, user, obj):
        # Superuser cannot commit superuser-suicide
        return user.is_superuser and obj.user != user


class NotProvisionedCanPost(BasePermission):
    def has_permission(self, request, view):
        from .utils import device_provisioned
        return not device_provisioned() and request.method == 'POST'


class UserHasAnyDevicePermissions(DenyAll):
    def has_permission(self, request, view):
        from .models import device_permissions_fields
        return any(getattr(request.user, field) for field in device_permissions_fields)
