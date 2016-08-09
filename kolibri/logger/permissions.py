from kolibri.auth.permissions.base import BasePermissions


class AnonymousUsersCanWriteAnonymousLogs(BasePermissions):
    """
    Permissions class that allows anonymous users to create logs with no associated user.
    """

    def user_can_create_object(self, user, obj):
        return user.is_anonymous() and not obj.user

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        # this one is a bit worrying, since anybody could update anonymous logs, but at least only if they have the ID
        # (and this is needed, in order to allow a ContentSessionLog to be updated within a session -- in theory,
        # we could add date checking in here to not allow further updating after a couple of days)
        return user.is_anonymous() and not obj.user

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()
