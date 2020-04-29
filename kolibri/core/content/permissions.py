from rest_framework.permissions import BasePermission

from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility


class CanManageContent(BasePermission):
    def has_permission(self, request, view):
        return request.user.can_manage_content

    def has_object_permission(self, request, view, obj):
        return request.user.can_manage_content


class CanExportLogs(BasePermission):
    def has_permission(self, request, view):
        return _user_is_admin_for_own_facility(request.user)

    def has_object_permission(self, request, view, obj):
        return _user_is_admin_for_own_facility(request.user)


class CanImportUsers(CanExportLogs):
    pass
