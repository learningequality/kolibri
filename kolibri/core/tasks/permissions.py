from abc import ABCMeta
from abc import abstractmethod

from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility


class BasePermission(metaclass=ABCMeta):
    """
    Base Permission class from which all other Permission classes should inherit.


    The following methods should be overridden in child classes:

    - The following Boolean (True/False) permission checks:
        - `user_can_run_job`
        - `user_can_read_job`
    - If a user can run a job, they will be able to create, cancel, and clear the job.
    - If a user can read a job, they will be able to see the job's status and progress.
    """

    def has_permission(self, user, job, view):
        if view.action == "list" or view.action == "retrieve":
            return self.user_can_read_job(user, job)
        return self.user_can_run_job(user, job)

    @abstractmethod
    def user_can_run_job(self, user, job):
        pass

    @abstractmethod
    def user_can_read_job(self, user, job):
        pass

    def __or__(self, other):
        """
        Allow two instances of BasePermission to be joined together with "|", which returns a permissions class
        that grants permission for an object when *either* of the instances would grant permission for that object.
        """
        return PermissionsFromAny(self, other)

    def __and__(self, other):
        """
        Allow two instances of BasePermission to be joined together with "&", which returns a permissions class
        that grants permission for an object when *both* of the instances grant permission for that object.
        """
        return PermissionsFromAll(self, other)


class PermissionsFromAny(BasePermission):
    """
    Serves as an "OR" operator for Permission classes; pass in a number of Permission classes,
    and the permission-checking methods on the PermissionsFromAny instance will return True if
    any of the Permission classes passed in (the "children" permissions) return True.
    """

    def __init__(self, *perms):
        self.perms = []
        for perm in perms:
            # ensure that perm is an instance of a subclass of BasePermission
            if not isinstance(perm, BasePermission):
                raise AssertionError(
                    "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
                )
            # add it into the children permissions list
            self.perms.append(perm)

    def _permissions_from_any(self, user, job, method_name):
        """
        Private helper method to do the corresponding method calls on children permissions instances,
        and succeed as soon as one of them succeeds, or fail if none of them do.
        """
        for perm in self.perms:
            if getattr(perm, method_name)(user, job):
                return True
        return False

    def user_can_run_job(self, user, job):
        return self._permissions_from_any(user, job, "user_can_run_job")

    def user_can_read_job(self, user, job):
        return self._permissions_from_any(user, job, "user_can_read_job")


class PermissionsFromAll(BasePermission):
    """
    Serves as an "AND" operator for Permission classes; pass in a number of Permission classes,
    and the permission-checking methods on the PermissionsFromAll instance will return True only if
    all of the Permission classes passed in (the "children" permissions) return True.
    """

    def __init__(self, *perms):
        self.perms = []
        for perm in perms:
            # ensure that perm is an instance of a subclass of BasePermission
            if not isinstance(perm, BasePermission):
                raise AssertionError(
                    "each of the arguments to __init__ must be a subclass (or instance of a subclass) of BasePermissions"
                )
            # add it into the children permissions list
            self.perms.append(perm)

    def _permissions_from_all(self, user, job, method_name):
        """
        Private helper method to do the corresponding method calls on children permissions instances,
        and fail as soon as one of them fails, or succeed if all of them succeed.
        """
        for perm in self.perms:
            if not getattr(perm, method_name)(user, job):
                return False
        return True

    def user_can_run_job(self, user, job):
        return self._permissions_from_all(user, job, "user_can_run_job")

    def user_can_read_job(self, user, job):
        return self._permissions_from_all(user, job, "user_can_read_job")


class IsSuperAdmin(BasePermission):
    """
    Permission class that grants permission for an object if the user is a superuser
    """

    def user_can_run_job(self, user, job):
        return user.is_superuser

    def user_can_read_job(self, user, job):
        return user.is_superuser


class CanManageContent(BasePermission):
    """
    Permission class that grants permission for an object if the user is a superuser
    """

    def user_can_run_job(self, user, job):
        return user.can_manage_content

    def user_can_read_job(self, user, job):
        return user.can_manage_content


class IsFacilityAdmin(BasePermission):
    """
    Basic permission class to check if the user is an admin.
    """

    def user_can_run_job(self, user, job):
        return _user_is_admin_for_own_facility(user)

    def user_can_read_job(self, user, job):
        return _user_is_admin_for_own_facility(user)


class IsAdmin(PermissionsFromAny):
    def __init__(self):
        super(IsAdmin, self).__init__(IsSuperAdmin(), IsFacilityAdmin())


class HasSameFacilityAsJob(BasePermission):
    def user_can_run_job(self, user, job):
        return user.facility_id == job.facility_id

    def user_can_read_job(self, user, job):
        return user.facility_id == job.facility_id


class IsFacilityAdminForJob(PermissionsFromAll):
    def __init__(self):
        super(IsFacilityAdminForJob, self).__init__(
            IsFacilityAdmin(), HasSameFacilityAsJob()
        )


class IsAdminForJob(PermissionsFromAny):
    def __init__(self):
        super(IsAdminForJob, self).__init__(IsSuperAdmin(), IsFacilityAdminForJob())


class NotProvisioned(BasePermission):
    def user_can_run_job(self, user, job):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()

    def user_can_read_job(self, user, job):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()
