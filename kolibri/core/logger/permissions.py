from kolibri.core.auth.permissions.base import BasePermissions
from kolibri.core.auth.permissions.base import lookup_field_with_fks
from kolibri.core.auth.permissions.base import q_none


class AnyoneCanWriteAnonymousLogs(BasePermissions):
    """
    Permissions class that allows anonymous users to create logs with no associated user.
    """

    def __init__(self, field_name="user_id"):
        self.field_name = field_name

    def user_can_create_object(self, user, obj):
        return lookup_field_with_fks(self.field_name, obj) is None

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        # this one is a bit worrying, since anybody could update anonymous logs, but at least only if they have the ID
        # (and this is needed, in order to allow a ContentSessionLog to be updated within a session -- in theory,
        # we could add date checking in here to not allow further updating after a couple of days)
        return lookup_field_with_fks(self.field_name, obj) is None

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user):
        return q_none
