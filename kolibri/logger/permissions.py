"""
The permissions classes in this module define the specific permissions that govern access to the models in the logger app.
"""

from kolibri.auth.constants import role_kinds
from kolibri.auth.permissions.base import RoleBasedPermissions


class UserLogPermissions(RoleBasedPermissions):
    def __init__(self):
        super(UserLogPermissions, self).__init__(
            target_field="user",
            can_be_created_by=(role_kinds.ADMIN,),
            can_be_read_by=(role_kinds.COACH, role_kinds.ADMIN),
            can_be_updated_by=(role_kinds.ADMIN,),
            can_be_deleted_by=(role_kinds.ADMIN,))
