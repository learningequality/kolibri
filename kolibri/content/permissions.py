from rest_framework.permissions import BasePermission, SAFE_METHODS


class OnlyDeviceOwnerCanDelete(BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.method == 'DELETE':
            return request.user.is_superuser

        return False
