"""
This module defines the base classes for Kolibri's class-based Permissions system. Other apps can import the classes
from this module in their own "permissions.py" module, and extend them, and then apply them to their own models.
"""


#####################################################################################################################
### This first section consists of the base permissions classes: the ones likely to be imported and extended.     ###
#####################################################################################################################

class BasePermissions(object):
    """
    Base Permission class from which all other Permission classes should inherit.
    By default, it denies permissions for everything. To be more permissive, override its methods.
    Note that if you don't need to distinguish between create, update, and delete permissions, you can
    simply override `_user_can_write_object` to define behavior for them in one place.
    """

    def user_can_create_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to create the provided <obj>.
        Note that the object may not yet have been saved to the database (as this may be a pre-save check)."""
        return self._user_can_write_object(user, obj)

    def user_can_read_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to read the provided <obj>."""
        return False

    def user_can_update_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to update the provided <obj>."""
        return self._user_can_write_object(user, obj)

    def user_can_delete_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to delete the provided <obj>."""
        return self._user_can_write_object(user, obj)

    def _user_can_write_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to write the provided <obj>.
        Note that this is a private method, but can be overridden to modify the default behavior for
        user_can_create_object, user_can_update_object, and user_can_delete_object in one fell swoop.
        """
        return False

    def readable_by_user_filter(user, queryset):
        """Applies a filter to the provided queryset, only returning items for which the user has read permission."""
        raise NotImplementedError("Override `readable_by_user_filter` in your permission class before you use it.")


class RoleBasedPermissions(BasePermissions):
    """
    Permissions class that defines a requesting user's permissions in terms of his or her role type with respect to
    the object's associated User or Collection. These permissions are defined in terms of two data structures:
    "permissions_by_role" (which lists which roles should have which permissions) and "target" (which
    specifies how to find the associated User or Collection that is the target for checking the user's roles).
    """

    # For each permission type (read/write, or create/read/update/delete), specify a list of roles that should
    # have that permission. By default, give permissions to no roles; override this or pass it into __init__
    permissions_by_role = {
        "read": [],
        "write": [],
    }

    # Specify the "target" of the permissions, in relation to the object for which permissions are being granted.
    # The "type" is either "user" or "collection", and the "field" is the field name (on the current object)
    # through which the target (user or collection) will be referenced (or "." if the object itself is the target).
    target = { # by default, the target is the user that is pointed to by the object's "user" field
        "type": "user",
        "field": "user",
    }

    def __init__(self, permissions_by_role=None, target=None):

        if permissions_by_role:
            self.permissions_by_role = permissions_by_role

        if target:
            self.target = target

        # ensure the `permissions_by_role` attribute has enough info to enable us to answer any query
        perms = self.permissions_by_role
        assert "read" in perms, "`permissions_by_role` must include a `read` key"
        assert ("write" in perms) or ("create" in perms and "update" in perms and "delete" in perms), \
            "`permissions_by_role` must include either a `read` key, or all of `create`, `update`, and `delete` keys"

        # ensure a valid target has been specified -- currently, targets can be either "collection" or "user"
        assert "type" in self.target and self.target["type"] in ["user", "collection"], \
            "`target['type']` must be either `user` or `collection`"
        assert "field" in self.target, "`target['field']` must be defined"

    def _check_role_permission(self, user, obj, permission_type):
        """
        Private helper method that does the actual role-based permission check.

        :param user: The User requesting permission to do the action.
        :param obj: The object being acted upon.
        :return: True if permission is granted, False otherwise.
        """

        # get the list of role types that should possess the given permission type
        permitted_roles = self.permissions_by_role[permission_type]

        # short circuit and allow, if the specification allows anyone to perform this action
        if "all" in permitted_roles:
            return True

        target_type = self.target["type"]
        target_field = self.target["field"]

        if target_field == ".": # this means the object itself is the target
            target_object = obj
        else: # otherwise, do the lookup based on the provided field name, and fetch the target object
            target_object = getattr(obj, target_field)

        # get the set of role types that the user actually possesses, in relation to target object (user or collection)
        if target_type == "user": # the target is a user
            # look up the roles the source (requesting) user has in relation to the target user
            possessed_roles = user.role_types_in_relation_to_user(target_user=target_object)
        elif target_type == "collection": # the target is a collection
            # look up the roles the source (requesting) collection has in relation to the target collection
            possessed_roles = user.role_types_in_relation_to_collection(target_collection=target_object)

        # grant permission if the user has at least one role that grants the appropriate permission
        return len(possessed_roles).intersection(permitted_roles)) > 0

    def user_can_create_object(self, user, obj):

        # if no explicit `create` permissions were specified, defer to the `write` permissions
        if "create" not in self.permissions_by_role:
            return self._user_can_write_object(user, obj)

        return self._check_role_permission(user, obj, "create")

    def user_can_read_object(self, user, obj):

        return self._check_role_permission(user, obj, "read")

    def user_can_update_object(self, user, obj):

        # if no explicit `update` permissions were specified, defer to the `write` permissions
        if "update" not in self.permissions_by_role:
            return self._user_can_write_object(user, obj)

        return self._check_role_permission(user, obj, "update")

    def user_can_delete_object(self, user, obj):

        # if no explicit `delete` permissions were specified, defer to the `write` permissions
        if "delete" not in self.permissions_by_role:
            return self._user_can_write_object(user, obj)

        return self._check_role_permission(user, obj, "delete")

    def _user_can_write_object(self, user, obj):

        return self._check_role_permission(user, obj, "write")


#####################################################################################################################
### This section consists of some example permissions classes; later, these would likely live within other apps.  ###
#####################################################################################################################

class IsDeviceOwner(BasePermissions):
    """
    Permissions class that only allows access to a DeviceOwner, and denies access to all others.
    """

    def user_can_read_object(self, user, obj):
        return user._is_device_owner

    def _user_can_write_object(self, user, obj):
        return user._is_device_owner


class UserLogPermissions(RoleBasedPermissions):
    """
    A general Permissions class intended for log data pertaining to a particular user (such as records
    of interactions with a piece of content). We allow the associated user herself, a coach for the user,
    or an admin for the user to read the log, but only the user herself or an admin to modify it.
    """

    permissions_by_role = {
        "read": ["self", "coach", "admin"],
        "write": ["self", "admin"],
    }

    target = {
        "type": "user",
        "field": "user",
    }


class FacilityUserPermissions(RoleBasedPermissions):
    """
    A Permissions class intended for controlling access to the FacilityUser object itself.
    """

    permissions_by_role = {
        "create": ["all"], # in terms of hard permissions, anyone can sign up, though we may limit this in interface
        "read": ["self", "coach", "admin"],
        "update": ["self", "admin"],
        "delete": ["admin"],
    }

    target = {
        "type": "user",
        "field": ".",
    }


class CollectionPermissions(RoleBasedPermissions):
    """
    A Permissions class intended for controlling access to a Collection object; writing is only allowed
    by an admin for the collection.
    """

    permissions_by_role = {
        "read": ["all"],
        "write": ["admin"],
    }

    target = {
        "type": "collection",
        "field": ".",
    }

    def user_can_create_object(self, user, obj):
        """
        We override this method because if we're creating a new Collection but haven't yet saved it, then
        it's not yet in the tree, so we need to base the permissions instead upon the parent Collection, if any.
        """
        if obj.parent:
            obj = obj.parent
        return self._check_role_permission(user, obj, "create")


#####################################################################################################################
### NOTE: THE PERMISSIONS CLASSES BELOW WERE MADE AS A PROOF OF CONCEPT, BUT ARE NOT CURRENTLY USED/REFERENCED    ###
### (They allow for "ANDing" or "ORing" of multiple Permissions classes; we may want to overload | and & instead) ###
#####################################################################################################################

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
            if issubclass(perm, BasePermissions):
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

    def _user_can_write_object(self, user, obj):

        return self._permissions_from_any(user, obj, "_user_can_write_object")

    def readable_by_user_filter(self, user, queryset):

        # call each of the children permissions instances in turn, performing an "OR" on the querysets
        union_queryset = queryset
        for perm in self.perms:
            union_queryset = union_queryset | perm.readable_by_user_filter(user, queryset)
        return queryset


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
            if issubclass(perm, BasePermissions):
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

    def _user_can_write_object(self, user, obj):
        return self._permissions_from_all(user, obj, "_user_can_write_object")

    def readable_by_user_filter(self, user, queryset):
        # call each of the children permissions instances in turn, iteratively filtering down the queryset
        for perm in self.perms:
            queryset = perm.readable_by_user_filter(user, queryset)
        return queryset

