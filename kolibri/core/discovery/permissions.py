from rest_framework.permissions import BasePermission


class NetworkLocationPermissions(BasePermission):
    """
    A user can access NetworkLocation objects if is a facility user:
    """

    def has_permission(self, request, view):
        return request.user.is_facility_user

    def has_object_permission(self, request, view, obj):
        return request.user.is_facility_user
