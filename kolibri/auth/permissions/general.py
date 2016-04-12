"""
The permissions classes in this module are broadly useful. Other apps can import the classes from this module
in their own "permissions.py" module, extend or remix them, and then apply them to their own models.
"""

from ..models import Collection
from .base import BasePermissions


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


class IsDeviceOwner(BasePermissions):
    """
    Permissions class that only allows access to a DeviceOwner (superuser), and denies access to all others.
    """

    def user_can_create_object(self, user, obj):
        return user.is_superuser

    def user_can_read_object(self, user, obj):
        return user.is_superuser

    def user_can_update_object(self, user, obj):
        return user.is_superuser

    def user_can_delete_object(self, user, obj):
        return user.is_superuser

    def readable_by_user_filter(self, user, queryset):
        if user.is_superuser:
            return queryset
        else:
            return queryset.none()


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

    def readable_by_user_filter(self, user, queryset):
        return queryset.filter(id=user.id)


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
        return (not self.read_only) and (user.id == getattr(obj, self.field_name))

    def user_can_create_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def user_can_read_object(self, user, obj):
        return user.id == getattr(obj, self.field_name)

    def user_can_update_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def user_can_delete_object(self, user, obj):
        return self._user_can_write_object(user, obj)

    def readable_by_user_filter(self, user, queryset):
        return queryset.filter(**{self.field_name: user.id})


class IsMember(BasePermissions):
    """
    Permissions class that only allows access to the object if the object is a Collection (or has a field, `field_name`,
    that foreign keys onto a Collection) and the user is a member of that Collection. If `field_name` is ".", which is
    the default, then the object itself is the Collection. If `read_only` is set to True, then write permissions are
    denied, even for the member.
    """

    def __init__(self, field_name=".", read_only=False):
        self.read_only = read_only
        self.field_name = field_name

    def _user_is_member(self, user, obj):

        if self.field_name == ".":
            coll = obj
        else:
            coll = getattr(obj, self.field_name)

        assert isinstance(coll, Collection)

        return user.is_member_of(coll)

    def user_can_create_object(self, user, obj):
        return (not self.read_only) and self._user_is_member(user, obj)

    def user_can_read_object(self, user, obj):
        return self._user_is_member(user, obj)

    def user_can_update_object(self, user, obj):
        return (not self.read_only) and self._user_is_member(user, obj)

    def user_can_delete_object(self, user, obj):
        return (not self.read_only) and self._user_is_member(user, obj)

    def readable_by_user_filter(self, user, queryset):
        # TODO(jamalex): reimplement this method in a more efficient way

        # get all the collections in which the user is a member
        collections = Collection.objects.filter(membership__user=user).get_ancestors(include_self=True)

        # filter the queryset based on the collections we calculated above
        if self.field_name == ".":
            return queryset.filter(id__in=collections)
        else:
            return queryset.filter(**{self.field_name + "__in": collections})


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

    def readable_by_user_filter(self, user, queryset):
        # filter the queryset by facility dataset, if the user is associated with one
        if hasattr(user, "dataset"):
            return queryset.filter(dataset=user.dataset)
        else:
            return queryset.none()
