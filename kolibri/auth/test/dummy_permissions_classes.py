from ..permissions import BasePermissions


class DenyAll(BasePermissions):

    def user_can_create_object(self, user, obj):
        return False

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return False

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()


class AllowAll(BasePermissions):

    def user_can_create_object(self, user, obj):
        return True

    def user_can_read_object(self, user, obj):
        return True

    def user_can_update_object(self, user, obj):
        return True

    def user_can_delete_object(self, user, obj):
        return True

    def readable_by_user_filter(self, user, queryset):
        return queryset


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
