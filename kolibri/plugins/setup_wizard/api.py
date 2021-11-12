from rest_framework import decorators
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .tasks import getusersinfo
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import provision_device
from kolibri.core.tasks.api import FacilityTasksViewSet
from kolibri.core.tasks.api import TasksViewSet


# Basic class that makes these endpoints unusable if device is provisioned
class HasPermissionDuringSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()


class HasPermissionDuringLODSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import get_device_setting

        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        return subset_of_users_device


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
        # Get the imported facility (assuming its the only one at this point)
        the_facility = Facility.objects.get()

        try:
            superuser = FacilityUser.objects.create_superuser(
                request.data.get("username"),
                request.data.get("password"),
                facility=the_facility,
                full_name=request.data.get("full_name"),
            )
            return Response({"username": superuser.username})

        except ValidationError:
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

    @decorators.action(methods=["post"], detail=False)
    def listfacilitylearners(self, request):
        """
        If the request is done by an admin user  it will return a list of the users of the
        facility

        :param baseurl: First part of the url of the server that's going to be requested
        :param facility_id: Id of the facility to authenticate and get the list of users
        :param username: Username of the user that's going to authenticate
        :param password: Password of the user that's going to authenticate
        :return: List of the learners of the facility.
        """
        facility_info = getusersinfo(request)
        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            raise PermissionDenied()
        students = [u for u in facility_info["users"] if not u["roles"]]
        return Response({"students": students, "admin": facility_info["user"]})


class SetupWizardFacilityImportTaskView(FacilityTasksViewSet):
    """
    An open version of FacilityTasksViewSet for the purposes of managing the
    import-facility task during setup
    """

    permission_classes = [HasPermissionDuringSetup | HasPermissionDuringLODSetup]

    # Remove all the endpoints we don't want in setup wizard
    startdataportalsync = property()
    startdataportalbulksync = property()
    # startpeerfacilityimport: not overwritten
    # startprovisionsoud: not overwritten
    startpeerfacilitysync = property()
    startdeletefacility = property()


class SetupWizardSoUDTaskView(TasksViewSet):
    """
    Needed because TasksViewSet permissions don't allow
    fetch list of task or create task from a provisioning device
    """

    permission_classes = [HasPermissionDuringSetup | HasPermissionDuringLODSetup]


class SetupWizardRestartZeroconf(ViewSet):
    """
    An utility endpoint to restart zeroconf after setup is finished
    in case this is a SoUD
    """

    permission_classes = [HasPermissionDuringSetup | HasPermissionDuringLODSetup]

    @decorators.action(methods=["post"], detail=False)
    def restart(self, request):
        import logging
        from kolibri.utils.server import update_zeroconf_broadcast

        logger = logging.getLogger(__name__)
        logger.info("Updating our Kolibri instance on the Zeroconf network now")
        update_zeroconf_broadcast()
        return Response({})
