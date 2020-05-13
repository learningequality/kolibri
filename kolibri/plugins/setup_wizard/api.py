from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from rest_framework.permissions import BasePermission


# Basic class that makes these endpoints unusable if device is provisioned
class HasPermissionDuringSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import device_provisioned
        return not device_provisioned()


class FacilityAdminView(GenericViewSet):
    """
    Returns basic data about admins from the just-imported Facility
    """
    permission_classes = (HasPermissionDuringSetup, )

    def list(self, request):
        # The filter is very loose, since we areassuming that the only
        # users are from the new facility
        queryset = FacilityUser.objects.filter(roles__kind__contains="admin")
        data = [{"username": user.username, "id": user.id} for user in queryset]
        return Response(data)


class GrantSuperuserPermissionsView(GenericViewSet):
    """
    Given a FacilityUser and their credentials, creates a DevicePermissions
    record with is_superuser = True
    """
    permission_classes = (HasPermissionDuringSetup, )

    def create(self, request):
        user_id = request.data.get("user_id", "")
        password = request.data.get("password", "")

        # Step 1: Get the Facility User object
        # TODO fail if user isn't admin
        try:
            facilityuser = FacilityUser.objects.get(id=user_id)
        except (Exception, FacilityUser.DoesNotExist):
            raise NotFound()

        # Step 2: Test the password
        if not facilityuser.check_password(password):
            raise PermissionDenied()

        # Step 3: If it succeeds, create a DevicePermissions model for
        # the user
        DevicePermissions.objects.update_or_create(
            user=facilityuser,
            defaults={"is_superuser": True, "can_manage_content": True},
        )

        # Finally: return a simple 200 so UI can continue on
        return Response({"user_id": user_id})


class StartFacilityImportTaskView(GenericViewSet):
    """
    Given a Device ID, Facility ID, and admin credentials, start
    a Facility Import task
    """

    permission_classes = (HasPermissionDuringSetup, )

    def create(self, request):
        # Step 1: Send all of the info over to the facility-import endpoint

        # If it fails, returns a 400

        # Step 2: If it succeeds, return 200. UI will continue to the progress page
        return Response(request.data)
