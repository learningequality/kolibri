from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility


class FacilitySyncPermissions(BasePermission):
    """
    A user can sync a facility with a peer or KDP if they are an admin in their
    own facility or a superuser
    """

    def has_permission(self, request, view):
        return request.user.is_superuser or _user_is_admin_for_own_facility(
            request.user
        )

    def has_object_permission(self, request, view):
        return request.user.is_superuser or _user_is_admin_for_own_facility(
            request.user
        )
