from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS


class OnlyCanManageContentCanDelete(BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.method == 'DELETE':
            return request.user.can_manage_content

        return False


class CanManageContent(BasePermission):

    def has_permission(self, request, view):
        return request.user.can_manage_content

    def has_object_permission(self, request, view, obj):
        return request.user.can_manage_content
