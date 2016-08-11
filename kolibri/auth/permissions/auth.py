"""
The permissions classes in this module define the specific permissions that govern access to the models in the auth app.
"""

from ..constants.collection_kinds import FACILITY
from ..constants.role_kinds import ADMIN, COACH
from .base import RoleBasedPermissions
from .general import DenyAll


class CollectionSpecificRoleBasedPermissions(RoleBasedPermissions):
    """
    A Permissions class intended for controlling access to a Collection object based on the user's role;
    writing is only allowed by an admin for the collection, and furthermore, no FacilityUser can delete a Facility.
    """

    def __init__(self):
        super(CollectionSpecificRoleBasedPermissions, self).__init__(
            target_field=".",
            can_be_created_by=None,
            can_be_read_by=(ADMIN, COACH),
            can_be_updated_by=(ADMIN,),
            can_be_deleted_by=None)

    def user_can_create_object(self, user, obj):
        """
        We override this method because if we're creating a new Collection but haven't yet saved it, then
        it's not yet in the tree, so we need to base the permissions instead upon the parent Collection, if any.
        """
        if obj.kind == FACILITY:
            # permissions for creating Facilities are defined elsewhere; they can't be created by FacilityUser
            return False
        else:
            # we allow a Collection to be created if the user has permissions to update the parent Collection
            return super(CollectionSpecificRoleBasedPermissions, self).user_can_update_object(user, obj.parent)

    def user_can_delete_object(self, user, obj):
        """
        We override this method to prevent FacilityUser from deleting a Facility (only DeviceAdmins should be able to do that).
        """
        if obj.kind == FACILITY:
            # disallow a FacilityUser from deleting a Facility
            return False
        else:
            # for non-Facility Collections, defer to the roles to determine delete permissions
            return super(CollectionSpecificRoleBasedPermissions, self).user_can_update_object(user, obj.parent)

class AnybodyCanCreateIfNoDeviceOwner(DenyAll):
    def user_can_create_object(self, user, obj):
        from ..models import DeviceOwner
        return DeviceOwner.objects.count() < 1

class AnybodyCanCreateIfNoFacility(DenyAll):
    def user_can_create_object(self, user, obj):
        from ..models import Facility
        return Facility.objects.count() < 1
