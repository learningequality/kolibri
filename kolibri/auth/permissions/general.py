"""
The permissions classes in this module are broadly useful. Other apps can import the classes from this module
in their own "permissions.py" module, extend or remix them, and then apply them to their own models.
"""

from ..constants import role_kinds
from .base import BasePermissions, lookup_field_with_fks


class DenyAll(BasePermissions):
    """
    Permissions class that doesn't allow anybody to do anything.
    """

    def user_can_create_object(self, user, obj):
        return False

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return False

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()

    def writable_by_user_filter(self, user, queryset):
        return queryset.none()


class AllowAll(BasePermissions):
    """
    Permissions class that allows anybody to do anything.
    """

    def user_can_create_object(self, user, obj):
        return True

    def user_can_read_object(self, user, obj):
        return True

    def user_can_update_object(self, user, obj):
        return True

    def user_can_delete_object(self, user, obj):
        return True

    def readable_by_user_filter(self, user, queryset):
        return queryset

    def writable_by_user_filter(self, user, queryset):
        return queryset


class IsSelf(BasePermissions):
    """
    Permissions class that only allows access to the object if the object *is* the user.
    If `read_only` is set to True, then write permissions are denied, even to the user.
    """

    def __init__(self, read_only=False):
        self.read_only = read_only

    def user_can_create_object(self, user, obj):
        # a user cannot create itself
        return False

    def user_can_read_object(self, user, obj):
        return user == obj

    def user_can_update_object(self, user, obj):
        return (not self.read_only) and (user == obj)

    def user_can_delete_object(self, user, obj):
        return (not self.read_only) and (user == obj)

    def _access_filter(self, user, queryset):
        if user.id is None:
            return queryset.none()
        return queryset.filter(id=user.id)

    def readable_by_user_filter(self, user, queryset):
        return _access_filter(user, queryset)

    def writable_by_user_filter(self, user, queryset):
        if self.read_only:
            return queryset.none()
        return self._access_filter(user, queryset)


class IsOwn(BasePermissions):
    """
    Permissions class that only allows access to the object if the object belongs to the requesting user
    (in other words, if the object has a specific field, `field_name`, that foreign keys onto the user).
    If `read_only` is set to True, then write permissions are denied, even for the user that owns it.
    """

    def __init__(self, field_name="user_id", read_only=False):
        self.read_only = read_only
        self.field_name = field_name

    def _user_can_write_object(self, user, obj):
        return (not self.read_only) and (user.id == lookup_field_with_fks(self.field_name, obj))

    def user_can_create_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def user_can_read_object(self, user, obj):
        return user.id == lookup_field_with_fks(self.field_name, obj)

    def user_can_update_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def user_can_delete_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def _access_filter(self, user, queryset):
        if user.is_anonymous():
            return queryset.none()
        return queryset.filter(**{self.field_name: user.id})

    def readable_by_user_filter(self, user, queryset):
        return self._access_filter(user, queryset)

    def writable_by_user_filter(self, user, queryset):
        if self.read_only:
            return queryset.none()
        return self._access_filter(user, queryset)


class IsFromSameFacility(BasePermissions):
    """
    Permissions class that only allows access to object if user is associated with the same facility as the object.
    """

    def __init__(self, field_name=".", read_only=False):
        self.read_only = read_only

    def _facility_dataset_is_same(self, user, obj):
        return hasattr(user, "dataset") and user.dataset == obj.dataset

    def user_can_create_object(self, user, obj):
        return (not self.read_only) and self._facility_dataset_is_same(user, obj)

    def user_can_read_object(self, user, obj):
        return self._facility_dataset_is_same(user, obj)

    def user_can_update_object(self, user, obj):
        return (not self.read_only) and self._facility_dataset_is_same(user, obj)

    def user_can_delete_object(self, user, obj):
        return (not self.read_only) and self._facility_dataset_is_same(user, obj)

    def _in_dataset_filter(self, user, queryset):
        if hasattr(user, "dataset"):
            return queryset.filter(dataset=user.dataset)
        else:
            return queryset.none()

    def readable_by_user_filter(self, user, queryset):
        return self._in_dataset_filter()

    def writable_by_user_filter(self, user, queryset):
        if self.read_only:
            return queryset.none()
        return self._in_dataset_filter()


class IsAdminForOwnFacility(BasePermissions):
    """
    Permissions class that only allows access to object if user is an admin for the facility the object is associated with.
    """

    def __init__(self, field_name=".", read_only=False):
        self.read_only = read_only

    def _user_is_admin_for_own_facility(self, user, obj=None):

        # import here to avoid circular imports
        from ..models import Facility

        if not hasattr(user, "dataset"):
            return False

        # if we've been given an object, make sure it too is from the same dataset (facility)
        if obj:
            if not hasattr(obj, "dataset") or not user.dataset == obj.dataset:
                return False

        facility = Facility.objects.get(dataset=user.dataset)
        return user.has_role_for_collection(role_kinds.ADMIN, facility)

    def user_can_create_object(self, user, obj):
        return (not self.read_only) and self._user_is_admin_for_own_facility(user, obj)

    def user_can_read_object(self, user, obj):
        return self._user_is_admin_for_own_facility(user, obj)

    def user_can_update_object(self, user, obj):
        return (not self.read_only) and self._user_is_admin_for_own_facility(user, obj)

    def user_can_delete_object(self, user, obj):
        return (not self.read_only) and self._user_is_admin_for_own_facility(user, obj)

    def _filter(self, user, queryset):
        if self._user_is_admin_for_own_facility(user):
            return queryset.filter(dataset=user.dataset)
        else:
            return queryset.none()

    def readable_by_user_filter(self, user, queryset):
        return self._filter(user, queryset)

    def writable_by_user_filter(self, user, queryset):
        return self._filter(user, queryset)
