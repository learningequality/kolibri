"""
This module defines the base classes for Kolibri's class-based Permissions system.
"""

from django.db.models import F


####################################################################################################################
# This section contains base classes that can be inherited and extended to define more complex permissions behavior.
####################################################################################################################

class BasePermissions(object):
    """
    Base Permission class from which all other Permission classes should inherit.


    The following methods should be overridden in child classes:

    - The following four Boolean (True/False) permission checks, corresponding to the "CRUD" operations:
        - `user_can_create_object`
        - `user_can_read_object`
        - `user_can_update_object`
        - `user_can_delete_object`
    - The queryset-filtering `readable_by_user_filter` method, which takes in a queryset and returns a queryset
      filtered down to just objects that should be readable by the user.

    Any permission class that defines the above methods

    """

    def user_can_create_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to create the provided <obj>.
        Note that the object may not yet have been saved to the database (as this may be a pre-save check)."""
        raise NotImplementedError("Override `user_can_create_object` in your permission class before you use it.")

    def user_can_read_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to read the provided <obj>."""
        raise NotImplementedError("Override `user_can_read_object` in your permission class before you use it.")

    def user_can_update_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to update the provided <obj>."""
        raise NotImplementedError("Override `user_can_update_object` in your permission class before you use it.")

    def user_can_delete_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to delete the provided <obj>."""
        raise NotImplementedError("Override `user_can_delete_object` in your permission class before you use it.")

    def readable_by_user_filter(self, user, queryset):
        """Applies a filter to the provided queryset, only returning items for which the user has read permission."""
        raise NotImplementedError("Override `readable_by_user_filter` in your permission class before you use it.")

    def __or__(self, other):
        """
        Allow two instances of BasePermission to be joined together with "|", which returns a permissions class
        that grants permission for an object when *either* of the instances would grant permission for that object.
        """
        return PermissionsFromAny(self, other)

    def __and__(self, other):
        """
        Allow two instances of BasePermission to be joined together with "&", which returns a permissions class
        that grants permission for an object when *both* of the instances grant permission for that object.
        """
        return PermissionsFromAll(self, other)


class RoleBasedPermissions(BasePermissions):
    """
    Permissions class that defines a requesting user's permissions in terms of his or her kinds of roles with respect
    to a User or Collection related to the object.

    To use this class, either subclass it and define the relevant attributes, or directly create an instance and pass
    in the attributes as parameters.

    See the comments below adjacent to the default attributes, for reference as to how to configure this class.
    """

    # For each crud operation, specify a list of role kinds that should have permission to perform that operation.
    # By default, give permissions to no roles; override this or pass it into __init__.
    can_be_created_by = None
    can_be_read_by = None
    can_be_updated_by = None
    can_be_deleted_by = None

    # The following will be used as a fallback for creation, updating, or deletion, if they're not defined
    can_be_written_by = None

    # Specify the field through which the role target (user or collection) will be referenced (or "." if the object itself
    # is the target). The referenced field should be a ForeignKey to either the FacilityUser or the Collection model.
    target_field = "user"  # by default, the target is the FacilityUser that is pointed to by the object's "user" field

    def __init__(self, can_be_created_by=None, can_be_read_by=None, can_be_updated_by=None, can_be_deleted_by=None,
                 can_be_written_by=None, target_field=None):

        if can_be_created_by is not None:
            self.can_be_created_by = can_be_created_by

        if can_be_read_by is not None:
            self.can_be_read_by = can_be_read_by

        if can_be_updated_by is not None:
            self.can_be_updated_by = can_be_updated_by

        if can_be_deleted_by is not None:
            self.can_be_deleted_by = can_be_deleted_by

        if can_be_written_by is not None:
            self.can_be_written_by = can_be_written_by

        if target_field is not None:
            self.target_field = target_field

        # to avoid confusion, ensure that the specific and general write permissions have not both been specified
        if isinstance(self.can_be_written_by, list):
            assert self.can_be_created_by is None, "Cannot define both `can_be_written_by` and `can_be_created_by`"
            assert self.can_be_updated_by is None, "Cannot define both `can_be_written_by` and `can_be_updated_by`"
            assert self.can_be_deleted_by is None, "Cannot define both `can_be_written_by` and `can_be_deleted_by`"

    def _get_target_object(self, obj):
        if self.target_field == ".":  # this means the object itself is the target
            return obj
        else:  # otherwise, do the lookup based on the provided field name, and fetch the target object
            # TODO(jamalex): allow related object lookups (e.g. "classroom__parent"), rather than just direct FK's
            return getattr(obj, self.target_field)

    def user_can_create_object(self, user, obj):

        if self.can_be_created_by is not None:
            roles = self.can_be_created_by
        else:
            roles = self.can_be_written_by
        assert isinstance(roles, list), \
            "If `can_be_created_by` is None, then either `can_be_written_by` must be defined as a fallback, or " + \
            "the `user_can_create_object` method must be overridden to define custom behavior."

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_read_object(self, user, obj):

        roles = self.can_be_read_by
        assert isinstance(roles, list), \
            "If `can_be_read_by` is None, then `user_can_read_object` method must be overridden with custom behavior."

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_update_object(self, user, obj):

        if self.can_be_updated_by is not None:
            roles = self.can_be_updated_by
        else:
            roles = self.can_be_written_by
        assert isinstance(roles, list), \
            "If `can_be_updated_by` is None, then either `can_be_written_by` must be defined as a fallback, or " + \
            "the `user_can_update_object` method must be overridden to define custom behavior."

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_delete_object(self, user, obj):

        if self.can_be_deleted_by is not None:
            roles = self.can_be_deleted_by
        else:
            roles = self.can_be_written_by
        assert isinstance(roles, list), \
            "If `can_be_deleted_by` is None, then either `can_be_written_by` must be defined as a fallback, or " + \
            "the `user_can_delete_object` method must be overridden to define custom behavior."

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def readable_by_user_filter(self, user, queryset):

        # import here to prevent circular dependencies
        from ..models import Collection
        from ..filters import HierarchyRelationsFilter

        query = {
            "source_user": user,
            "role_kind": self.can_be_read_by,
        }

        if self.target_field == ".":
            if issubclass(queryset.model, Collection):
                query["descendant_collection"] = F("id")
            else:
                query["target_user"] = F("id")
        else:
            related_model = queryset.model._meta.get_field(self.target_field).remote_field.model
            if issubclass(related_model, Collection):
                query["descendant_collection"] = F(self.target_field)
            else:
                query["target_user"] = F(self.target_field)

        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(**query)


####################################################################################################################
# This section contains Boolean permissions classes that allow multiple permissions classes to be joined together.
####################################################################################################################

class PermissionsFromAny(BasePermissions):
    """
    Serves as an "OR" operator for Permission classes; pass in a number of Permission classes,
    and the permission-checking methods on the PermissionsFromAny instance will return True if
    any of the Permission classes passed in (the "children" permissions) return True.
    """

    def __init__(self, *perms):
        self.perms = []
        for perm in perms:
            # if it's an uninstantiated class, instantiate it
            if isinstance(perm, type) and issubclass(perm, BasePermissions):
                perm = perm()
            # ensure that what we now have is an instance of a subclass of BasePermissions
            assert isinstance(perm, BasePermissions), \
                "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
            # add it into the children permissions list
            self.perms.append(perm)

    def _permissions_from_any(self, user, obj, method_name):
        """
        Private helper method to do the corresponding method calls on children permissions instances,
        and succeed as soon as one of them succeeds, or fail if none of them do.
        """
        for perm in self.perms:
            if getattr(perm, method_name)(user, obj):
                return True
        return False

    def user_can_create_object(self, user, obj):
        return self._permissions_from_any(user, obj, "user_can_create_object")

    def user_can_read_object(self, user, obj):
        return self._permissions_from_any(user, obj, "user_can_read_object")

    def user_can_update_object(self, user, obj):
        return self._permissions_from_any(user, obj, "user_can_update_object")

    def user_can_delete_object(self, user, obj):
        return self._permissions_from_any(user, obj, "user_can_delete_object")

    def readable_by_user_filter(self, user, queryset):
        # call each of the children permissions instances in turn, performing an "OR" on the querysets
        union_queryset = queryset.none()
        for perm in self.perms:
            union_queryset = union_queryset | perm.readable_by_user_filter(user, queryset)
        return union_queryset


class PermissionsFromAll(BasePermissions):
    """
    Serves as an "AND" operator for Permission classes; pass in a number of Permission classes,
    and the permission-checking methods on the PermissionsFromAll instance will return True only if
    all of the Permission classes passed in (the "children" permissions) return True.
    """

    def __init__(self, *perms):
        self.perms = []
        for perm in perms:
            # if it's an uninstantiated class, instantiate it
            if isinstance(perm, type) and issubclass(perm, BasePermissions):
                perm = perm()
            # ensure that what we now have is an instance of a subclass of BasePermissions
            assert isinstance(perm, BasePermissions), \
                "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
            # add it into the children permissions list
            self.perms.append(perm)

    def _permissions_from_all(self, user, obj, method_name):
        """
        Private helper method to do the corresponding method calls on children permissions instances,
        and fail as soon as one of them fails, or succeed if all of them succeed.
        """
        for perm in self.perms:
            if not getattr(perm, method_name)(user, obj):
                return False
        return True

    def user_can_create_object(self, user, obj):
        return self._permissions_from_all(user, obj, "user_can_create_object")

    def user_can_read_object(self, user, obj):
        return self._permissions_from_all(user, obj, "user_can_read_object")

    def user_can_update_object(self, user, obj):
        return self._permissions_from_all(user, obj, "user_can_update_object")

    def user_can_delete_object(self, user, obj):
        return self._permissions_from_all(user, obj, "user_can_delete_object")

    def readable_by_user_filter(self, user, queryset):
        # call each of the children permissions instances in turn, iteratively filtering down the queryset
        for perm in self.perms:
            queryset = perm.readable_by_user_filter(user, queryset)
        return queryset
