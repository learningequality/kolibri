from rest_framework.permissions import BasePermission


class CanManageContent(BasePermission):
    def has_permission(self, request, view):
        return request.user.can_manage_content

    def has_object_permission(self, request, view, obj):
        return request.user.can_manage_content
