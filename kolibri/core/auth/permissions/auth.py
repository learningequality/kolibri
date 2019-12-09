"""
The permissions classes in this module define the specific permissions that govern access to the models in the auth app.
"""
from django.contrib.auth.models import AnonymousUser

from ..constants.collection_kinds import FACILITY
from ..constants.collection_kinds import LEARNERGROUP
from ..constants.collection_kinds import ADHOCLEARNERSGROUP
from ..constants.role_kinds import ADMIN
from ..constants.role_kinds import COACH
from .base import BasePermissions
from .base import RoleBasedPermissions
from .general import DenyAll


class CollectionSpecificRoleBasedPermissions(RoleBasedPermissions):
    """
    A Permissions class intended for controlling access to a Collection object based on the user's role;
    writing is only allowed by an admin for the collection, and furthermore, no FacilityUser can delete a Facility.
    """

    def __init__(self):
        super(CollectionSpecificRoleBasedPermissions, self).__init__(
            target_field=".",
            can_be_created_by=None,
            can_be_read_by=(ADMIN, COACH),
            can_be_updated_by=(ADMIN,),
            can_be_deleted_by=None,
        )

    def user_can_create_object(self, user, obj):
        """
        We override this method because if we're creating a new Collection but haven't yet saved it, then
        it's not yet in the tree, so we need to base the permissions instead upon the parent Collection, if any.
        """
        if obj.kind == FACILITY:
            # permissions for creating Facilities are defined elsewhere; they can't be created by FacilityUser
            return False
        else:
            # we allow a Collection to be created if the user has permissions to update the parent Collection
            return super(
                CollectionSpecificRoleBasedPermissions, self
            ).user_can_update_object(user, obj.parent)

    def user_can_delete_object(self, user, obj):
        """
        We override this method to prevent FacilityUser from deleting a Facility (only DeviceAdmins should be able to do that).
        """
        if obj.kind == FACILITY:
            # disallow a FacilityUser from deleting a Facility
            return False
        else:
            # for non-Facility Collections, defer to the roles to determine delete permissions
            return super(
                CollectionSpecificRoleBasedPermissions, self
            ).user_can_update_object(user, obj.parent)


class AnonUserCanReadFacilities(DenyAll):
    """
    Permissions class that allows reading the object if user is anonymous.
    """

    def user_can_read_object(self, user, obj):
        if obj.kind == FACILITY:
            return isinstance(user, AnonymousUser)
        else:
            return False

    def readable_by_user_filter(self, user, queryset):
        if isinstance(user, AnonymousUser):
            return queryset.filter(kind=FACILITY)
        return queryset.none()


class FacilityAdminCanEditForOwnFacilityDataset(BasePermissions):
    """
    Permission class that allows write access to dataset settings if they are admin for facility.
    """

    def _facility_dataset_is_same(self, user, obj):
        return hasattr(user, "dataset") and user.dataset_id == obj.id

    def _user_is_admin_for_related_facility(self, user, obj=None):

        # import here to avoid circular imports
        from ..models import FacilityDataset

        if not hasattr(user, "dataset"):
            return False

        # if we've been given an object, make sure it too is from the same dataset (facility)
        if obj:
            if not user.dataset_id == obj.id:
                return False
        else:
            obj = FacilityDataset.objects.get(id=user.dataset_id)

        facility = obj.collection_set.first()
        return user.has_role_for_collection(ADMIN, facility)

    def user_can_create_object(self, user, obj):
        return self._user_is_admin_for_related_facility(user, obj)

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return self._user_is_admin_for_related_facility(user, obj)

    def user_can_delete_object(self, user, obj):
        return False

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()


class AllCanReadFacilityDataset(BasePermissions):
    """
    Permission class that allows read access to dataset settings for anyone.
    """

    def user_can_read_object(self, user, obj):
        return True

    def readable_by_user_filter(self, user, queryset):
        return queryset

    def user_can_create_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return False

    def user_can_delete_object(self, user, obj):
        return False


class CoachesCanManageGroupsForTheirClasses(BasePermissions):
    def _user_is_coach_for_classroom(self, user, obj):
        # make sure the target object is a group and user is a coach for the group's classroom
        return (
            obj.kind == LEARNERGROUP or obj.kind == ADHOCLEARNERSGROUP
        ) and user.has_role_for_collection(COACH, obj.parent)

    def user_can_create_object(self, user, obj):
        return self._user_is_coach_for_classroom(user, obj)

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return self._user_is_coach_for_classroom(user, obj)

    def user_can_delete_object(self, user, obj):
        return self._user_is_coach_for_classroom(user, obj)

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()


class CoachesCanManageMembershipsForTheirGroups(BasePermissions):
    def _user_is_coach_for_group(self, user, group):
        # make sure the target object is a group and user is a coach for the group
        return (
            group.kind == LEARNERGROUP or group.kind == ADHOCLEARNERSGROUP
        ) and user.has_role_for_collection(COACH, group)

    def _user_should_be_able_to_manage(self, user, obj):
        # Requesting user must be a coach for the group
        if not self._user_is_coach_for_group(user, obj.collection):
            return False
        # Membership user must already be a member of the collection
        if not obj.user.is_member_of(obj.collection.parent):
            return False
        return True

    def user_can_create_object(self, user, obj):
        return self._user_should_be_able_to_manage(user, obj)

    def user_can_read_object(self, user, obj):
        return False

    def user_can_update_object(self, user, obj):
        return self._user_should_be_able_to_manage(user, obj)

    def user_can_delete_object(self, user, obj):
        return self._user_should_be_able_to_manage(user, obj)

    def readable_by_user_filter(self, user, queryset):
        return queryset.none()
