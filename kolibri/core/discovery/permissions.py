from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility


class NetworkLocationPermissions(BasePermission):
    """
    A user can access NetworkLocation objects if:
    1. User can manage content (to get import/export peers)
    2. User is a facility admin (to be able to sync facility with peer)
    """

    def has_permission(self, request, view):
        return request.user.can_manage_content or _user_is_admin_for_own_facility(
            request.user
        )

    def has_object_permission(self, request, view, obj):
        # Don't pass `obj` because locations don't have facilities attached to them
        return request.user.can_manage_content or _user_is_admin_for_own_facility(
            request.user
        )
