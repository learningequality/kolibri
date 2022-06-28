from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility
from kolibri.core.device.utils import get_device_setting


class NetworkLocationPermissions(BasePermission):
    """
    A user can access NetworkLocation objects if:
    1. User can manage content (to get import/export peers)
    2. User is a facility admin (to be able to sync facility with peer)
    In not Learner Only Devices, for users to be able to change to another facility,
    any facility user must be able to discover other facilities
    """

    def has_permission(self, request, view):
        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        if subset_of_users_device:
            return request.user.can_manage_content or _user_is_admin_for_own_facility(
                request.user
            )
        else:
            return request.user.is_facility_user

    def has_object_permission(self, request, view, obj):
        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        if subset_of_users_device:
            return request.user.can_manage_content or _user_is_admin_for_own_facility(
                request.user
            )
        else:
            return request.user.is_facility_user
