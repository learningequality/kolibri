"""
The permissions classes in this module define the specific permissions that govern access to the models in the auth app.
"""

from ..constants.role_kinds import ADMIN, COACH
from .base import RoleBasedPermissions


class CollectionReadableByAdminsAndCoachesAndWritableByAdmins(RoleBasedPermissions):
    """
    A Permissions class intended for controlling access to a Collection object based on the user's role;
    writing is only allowed by an admin for the collection.
    """

    can_be_read_by = [ADMIN, COACH]
    can_be_written_by = [ADMIN]

    # the target for checking the role is the object itself, as it's a collection
    target_field = "."

    def user_can_create_object(self, user, obj):
        """
        We override this method because if we're creating a new Collection but haven't yet saved it, then
        it's not yet in the tree, so we need to base the permissions instead upon the parent Collection, if any.
        """
        if obj.parent:
            # we allow a Collection to be created if the user has permissions to update the parent Collection
            return super(CollectionReadableByAdminsAndCoachesAndWritableByAdmins, self).user_can_update_object(user, obj.parent)
        else:
            # creating a Collection with no parent means it's a Facility; permissions for that are defined elsewhere
            return False
