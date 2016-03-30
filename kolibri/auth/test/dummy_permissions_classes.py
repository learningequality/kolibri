from ..base_permissions import BasePermissions


class ThrowExceptions(BasePermissions):

    def user_can_create_object(self, user, obj):
        raise Exception()

    def user_can_read_object(self, user, obj):
        raise Exception()

    def user_can_update_object(self, user, obj):
        raise Exception()

    def user_can_delete_object(self, user, obj):
        raise Exception()

    def readable_by_user_filter(self, user, queryset):
        raise Exception()
