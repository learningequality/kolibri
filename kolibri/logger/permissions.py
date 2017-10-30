from kolibri.auth.permissions.base import BasePermissions, lookup_field_with_fks
from rest_framework import permissions


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

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class ExamActivePermissions(permissions.BasePermission):
    """
    A Django REST Framework permissions class that does not allow writes to examattemptlogs
    when the exam has been submitted, or the exam closed.
    """

    def has_permission(self, request, view):
        # as `has_object_permission` isn't called for POST/create, we need to check here
        if (request.method == "POST" or request.method == "PATCH") and request.data:
            validated_data = view.serializer_class().to_internal_value(_ensure_raw_dict(request.data))
            # Make sure the examlog is not closed and the exam is active
            return not validated_data['examlog'].closed and validated_data['examlog'].exam.active

        return True
