from rest_framework import decorators
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import provision_device
from kolibri.core.tasks.api import FacilityTasksViewSet


# Basic class that makes these endpoints unusable if device is provisioned
class HasPermissionDuringSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()


class FacilityImportViewSet(ViewSet):
    """
    A group of endpoints that are used by the SetupWizard to import a facility
    and create a superuser
    """

    permission_classes = (HasPermissionDuringSetup,)

    @decorators.action(methods=["get"], detail=False)
    def facilityadmins(self, request):
        # The filter is very loose, since we are assuming that the only
        # users are from the new facility
        queryset = FacilityUser.objects.filter(roles__kind__contains="admin")
        response_data = [
            {"username": user.username, "id": user.id} for user in queryset
        ]
        return Response(response_data)

    @decorators.action(methods=["post"], detail=False)
    def grantsuperuserpermissions(self, request):
        """
        Given a user ID and credentials, create a superuser DevicePermissions record
        """
        user_id = request.data.get("user_id", "")
        password = request.data.get("password", "")

        # Get the Facility User object
        try:
            facilityuser = FacilityUser.objects.get(id=user_id)
        except (Exception, FacilityUser.DoesNotExist):
            raise NotFound()

        # Test for password and admin role
        if (
            not facilityuser.check_password(password)
            or user_kinds.ADMIN not in facilityuser.session_data["kind"]
        ):
            raise PermissionDenied()

        # If it succeeds, create a DevicePermissions model for the user
        DevicePermissions.objects.update_or_create(
            user=facilityuser,
            defaults={"is_superuser": True, "can_manage_content": True},
        )

        # Finally: return a simple 200 so UI can continue on
        return Response({"user_id": user_id})

    @decorators.action(methods=["post"], detail=False)
    def createsuperuser(self, request):
        """
        Given a username, full name and password, create a superuser attached
        to the facility that was imported
        """
        from kolibri.core.device.utils import create_superuser

        # Get the imported facility (assuming its the only one at this point)
        the_facility = Facility.objects.get()

        try:
            superuser = create_superuser(request.data, facility=the_facility)
            return Response({"username": superuser.username})

        except (Exception,):
            raise ValidationError(detail="duplicate", code="duplicate_username")

    @decorators.action(methods=["post"], detail=False)
    def provisiondevice(self, request):
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


class SetupWizardFacilityImportTaskView(FacilityTasksViewSet):
    """
    An open version of FacilityTasksViewSet for the purposes of managing the
    import-facility task during setup
    """

    permission_classes = (HasPermissionDuringSetup,)

    # Remove all the endpoints we don't want in setup wizard
    startdataportalsync = property()
    startdataportalbulksync = property()
    # startpeerfacilityimport: not overwritten
    startpeerfacilitysync = property()
    startdeletefacility = property()
