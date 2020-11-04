from rest_framework import permissions

from kolibri.core.auth.permissions.base import BasePermissions


class AnyoneCanReadOwnerlessShortcuts(BasePermissions):
    """
    Permissions class that allows any user to read shortucts with no associated user.
    """

    def user_can_create_object(self, user, obj):
        return False

    def user_can_read_object(self, user, obj):
        return obj.user is None

    def user_can_update_object(self, user, obj):
        return False

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user, queryset):
        return queryset.filter(user_id=None)
