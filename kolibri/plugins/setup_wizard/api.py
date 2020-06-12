from rest_framework.exceptions import NotFound
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from kolibri.core.auth.constants import user_kinds
from kolibri.core.device.utils import provision_device
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import FacilityUserModelManager
from kolibri.core.auth.models import Facility
from kolibri.core.device.models import DevicePermissions
from kolibri.core.tasks.api import FacilityTasksViewSet


# Basic class that makes these endpoints unusable if device is provisioned
class HasPermissionDuringSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()


class FacilityAdminView(GenericViewSet):
    """
    Returns basic data about admins from the just-imported Facility
    """

    permission_classes = ()

    def list(self, request):
        # The filter is very loose, since we are assuming that the only
        # users are from the new facility
        queryset = FacilityUser.objects.filter(roles__kind__contains="admin")
        response_data = [
            {"username": user.username, "id": user.id} for user in queryset
        ]
        return Response(response_data)


class GrantSuperuserPermissionsView(GenericViewSet):
    """
    Given a FacilityUser and their credentials, creates a DevicePermissions
    record with is_superuser = True
    """

    permission_classes = (HasPermissionDuringSetup,)

    def create(self, request):
        user_id = request.data.get("user_id", "")
        password = request.data.get("password", "")

        # Step 1: Get the Facility User object
        try:
            facilityuser = FacilityUser.objects.get(id=user_id)
        except (Exception, FacilityUser.DoesNotExist):
            raise NotFound()

        # Step 2: Test for password and admin role
        if (
            not facilityuser.check_password(password)
            or user_kinds.ADMIN not in facilityuser.session_data["kind"]
        ):
            raise PermissionDenied()

        # Step 3: If it succeeds, create a DevicePermissions model for
        # the user
        DevicePermissions.objects.update_or_create(
            user=facilityuser,
            defaults={"is_superuser": True, "can_manage_content": True},
        )

        # Finally: return a simple 200 so UI can continue on
        return Response({"user_id": user_id})


class CreateSuperuserAfterFacilityImportView(GenericViewSet):
    permission_classes = (HasPermissionDuringSetup,)

    def create(self, request):
        """
        Creates a superuser in the facility that was just imported
        """
        from kolibri.core.device.utils import create_superuser

        # Get the imported facility (assuming its the only one at this point)
        the_facility = Facility.objects.get()

        try:
            superuser = create_superuser(request.data, facility=the_facility)
            return Response({"username": superuser.username})

        except (Exception,):
            raise ValidationError(detail="duplicate", code="duplicate_username")


class SetupWizardFacilityImportTaskView(FacilityTasksViewSet):
    """
    An open version of FacilityTasksViewSet for the purposes of managing the
    import-facility task during setup
    """

    # TODO remove other methods
    permission_classes = (HasPermissionDuringSetup,)


class ProvisionDeviceAfterFacilityImportView(GenericViewSet):

    permission_classes = (HasPermissionDuringSetup,)

    def create(self, request):
        """
        After importing a Facility and designating/creating a super admins,
        provision the device using that facility
        """

        # TODO validate the data
        device_name = request.data.get("device_name", "")
        language_id = request.data.get("language_id", "")

        # Get the imported facility (assuming its the only one at this point)
        the_facility = Facility.objects.get()

        # Use the facility's preset to determine whether to allow guest access
        allow_guest_access = the_facility.dataset.preset != "formal"

        # Finally: Call provision_device
        provision_device(
            device_name=device_name,
            language_id=language_id,
            default_facility=the_facility,
            allow_guest_access=allow_guest_access,
        )

        return Response({})
