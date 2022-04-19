"""
This module defines the base classes for Kolibri's class-based Permissions system.
"""
from django.db.models import Q

from kolibri.core.auth.constants import role_kinds


####################################################################################################################
# This section contains base classes that can be inherited and extended to define more complex permissions behavior.
####################################################################################################################
q_none = Q(pk__in=[])


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

    """

    def user_can_create_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to create the provided <obj>.
        Note that the object may not yet have been saved to the database (as this may be a pre-save check)."""
        raise NotImplementedError(
            "Override `user_can_create_object` in your permission class before you use it."
        )

    def user_can_read_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to read the provided <obj>."""
        raise NotImplementedError(
            "Override `user_can_read_object` in your permission class before you use it."
        )

    def user_can_update_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to update the provided <obj>."""
        raise NotImplementedError(
            "Override `user_can_update_object` in your permission class before you use it."
        )

    def user_can_delete_object(self, user, obj):
        """Returns True if this permission class grants <user> permission to delete the provided <obj>."""
        raise NotImplementedError(
            "Override `user_can_delete_object` in your permission class before you use it."
        )

    def readable_by_user_filter(self, user):
        """Returns a Q object that defines a filter for objects readable by this user."""
        raise NotImplementedError(
            "Override `readable_by_user_filter` in your permission class before you use it."
        )

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
    to a User or Collection that is related to the object.
    """

    def __init__(
        self,
        target_field,
        can_be_created_by,
        can_be_read_by,
        can_be_updated_by,
        can_be_deleted_by,
        collection_field="collection",
        is_syncable=True,
    ):
        """
        :param str target_field: the name of the field through which the role target (user or collection) will be referenced
        (or "." if the object itself is the target). The referenced field should be a ``ForeignKey`` either to a
        ``FacilityUser`` or a ``Collection`` model.
        :param tuple can_be_created_by: a tuple of role kinds that should give a user permission to create the object
        :param tuple can_be_read_by: a tuple of role kinds that should give a user permission to read the object
        :param tuple can_be_updated_by: a tuple of role kinds that should give a user permission to update the object
        :param tuple can_be_deleted_by: a tuple of role kinds that should give a user permission to delete the object
        :param str collection_field: the name of the field through which collections can be identified for the object.
        :param is_syncable: Boolean indicating whether the model is a syncable model, if it is, we can use dataset_id
        to do quick filtering in some cases, if not, then we need to use the target_field as the source of the dataset_id.
        """
        self.can_be_created_by = can_be_created_by
        self.can_be_read_by = can_be_read_by
        self.can_be_updated_by = can_be_updated_by
        self.can_be_deleted_by = can_be_deleted_by
        self.target_field = target_field
        self.collection_field = collection_field
        self.is_syncable = is_syncable

    def _get_target_object(self, obj):
        if self.target_field == ".":  # this means the object itself is the target
            return obj
        # TODO(jamalex): allow related object lookups (e.g. "classroom__parent"), rather than just direct FK's
        return getattr(obj, self.target_field)

    def user_can_create_object(self, user, obj):

        roles = getattr(self, "can_be_created_by", None)

        if not isinstance(roles, tuple):
            raise AssertionError(
                "If `can_be_created_by` is None, then `user_can_create_object` method must be overridden with custom behavior."
            )

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_read_object(self, user, obj):

        roles = getattr(self, "can_be_read_by", None)

        if not isinstance(roles, tuple):
            raise AssertionError(
                "If `can_be_read_by` is None, then `user_can_read_object` method must be overridden with custom behavior."
            )

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_update_object(self, user, obj):

        roles = getattr(self, "can_be_updated_by", None)

        if not isinstance(roles, tuple):
            raise AssertionError(
                "If `can_be_updated_by` is None, then `user_can_update_object` method must be overridden with custom behavior."
            )

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def user_can_delete_object(self, user, obj):

        roles = getattr(self, "can_be_deleted_by", None)

        if not isinstance(roles, tuple):
            raise AssertionError(
                "If `can_be_deleted_by` is None, then `user_can_delete_object` method must be overridden with custom behavior."
            )

        target_object = self._get_target_object(obj)
        return user.has_role_for(roles, target_object)

    def readable_by_user_filter(self, user):
        from kolibri.core.auth.models import Role

        if user.is_anonymous():
            return q_none

        roles = list(
            Role.objects.filter(user=user.id, kind__in=self.can_be_read_by)
            .values("collection_id", "kind")
            .order_by()
        )
        # If the user has any of the can_be_read_by roles at the facility level, then we know they can read
        # anything in the facility.
        if any(r["collection_id"] == user.facility_id for r in roles):
            # Everything in the facility shares the same dataset_id so use this for quick filtering.
            if self.is_syncable:
                # If it is a syncable model then it will have a dataset_id
                return Q(dataset_id=user.dataset_id)
            # If it is not syncable, then reference the dataset_id from the target_field
            return Q(**{"{}__dataset_id".format(self.target_field): user.dataset_id})

        # If we've got to this point, we've already checked for facility admins, and we currently only allow
        # admins to be set at the facility level, so if we're not allowing coaches to read this, we can return none
        if role_kinds.COACH not in self.can_be_read_by:
            return q_none

        # Use this to default to an empty queryset, equivalent to doing queryset.none() if there are no applicable
        # roles in the query below.
        # Django is also seemingly smart enough to know that this would resolve to nothing, and does not bother
        # doing a query in this case.
        q_filter = q_none

        # User is not a facility admin or a class admin. Find the classes for which they are coaches.
        collection_ids = [
            r["collection_id"] for r in roles if r["kind"] == role_kinds.COACH
        ]

        if collection_ids:
            # Filter the queryset based on the field that identifies
            # which collection an object is associated with.
            q_filter = Q(
                Q(**{"{}__in".format(self.collection_field): collection_ids})
                | Q(**{"{}__parent__in".format(self.collection_field): collection_ids})
            )
            # Also filter by the parents of collections, so that objects associated with LearnerGroup
            # or AdHocGroups will also be readable by those with coach permissions on the parent Classroom

        return q_filter


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
            # ensure that perm is an instance of a subclass of BasePermissions
            if not isinstance(perm, BasePermissions):
                raise AssertionError(
                    "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
                )
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

    def readable_by_user_filter(self, user):
        # call each of the children permissions instances in turn, performing an "OR" on the filters
        union_filter = q_none
        for perm in self.perms:
            union_filter = union_filter | perm.readable_by_user_filter(user)
        return union_filter


class PermissionsFromAll(BasePermissions):
    """
    Serves as an "AND" operator for Permission classes; pass in a number of Permission classes,
    and the permission-checking methods on the PermissionsFromAll instance will return True only if
    all of the Permission classes passed in (the "children" permissions) return True.
    """

    def __init__(self, *perms):
        self.perms = []
        for perm in perms:
            # ensure that perm is an instance of a subclass of BasePermissions
            if not isinstance(perm, BasePermissions):
                raise AssertionError(
                    "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
                )
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

    def readable_by_user_filter(self, user):
        # call each of the children permissions instances in turn, conjoining each filter
        intersection_filter = Q()
        for perm in self.perms:
            intersection_filter = intersection_filter & perm.readable_by_user_filter(
                user
            )
        return intersection_filter


# helper functions
def lookup_field_with_fks(field_ref, obj):
    for key in field_ref.split("__"):
        obj = getattr(obj, key)
    return obj
