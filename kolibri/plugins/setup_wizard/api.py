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
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import provision_device


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


class SetupWizardResource(ViewSet):
    """
    Generic endpoints for use during various setup wizard onboarding flows
    """

    permission_classes = (HasPermissionDuringSetup,)

    @decorators.action(methods=["post"], detail=False)
    def createappuser(self, request):
        """
        Creates a Learner from the OS User
        NOTE: This is for use when the App Plugin is *enabled*
        """
        facility_name = request.data.get("facility_name", None)

        if Facility.objects.count() == 0:
            # FIXME If we are using a default message, should we translate it?
            facility = Facility.objects.create(name="Personal")
        else:
            facility = Facility.objects.get()
            if facility_name:
                facility.name = facility_name

        # Set the facility to have been created during On my own setup
        facility.on_my_own_setup = True
        facility.save()

        osuser = FacilityUser.objects.get_or_create_os_user(
            facility=facility, auth_token=request.data.get("auth_token")
        )
        return Response({"username": osuser.get("username")})

    @decorators.action(methods=["post"], detail=False)
    def createonmyownuser(self, request):
        """
        Creating a Learner who has signed up using the On My Own flow
        NOTE: This is for use when the App Plugin is *disabled*
        """
        facility_name = request.data.get("facility_name", "Personal")

        if Facility.objects.count() == 0:
            facility = Facility.objects.create(name=facility_name)
        else:
            facility = Facility.objects.get()
            if facility_name:
                facility.name = facility_name
                facility.save()

        if not facility:
            return Response("facility_name is a required field", status=400)

        username = request.data.get("username")
        password = request.data.get("password")
        full_name = request.data.get("full_name")

        if not (username and password):
            return Response(
                "username and password fields are required fields", status=400
            )

        # Here we only expect and accept the on_my_own_setup extra_field and set it directly
        # using the setter method for `on_my_own_setup` on Facility
        extra_fields = request.data.get("extra_fields", None)
        if extra_fields and extra_fields.get("on_my_own_setup"):
            facility.on_my_own_setup = extra_fields.get("on_my_own_setup")

        if extra_fields and extra_fields.get("os_user"):
            osuser = FacilityUser.objects.get_or_create_os_user(
                facility=facility, auth_token=request.data.get("auth_token")
            )
            return Response({"username": osuser.get("username")})

        try:
            user = FacilityUser.objects.create(
                username=username, facility=facility, full_name=full_name
            )
            user.set_password(password)
            user.save()
            return Response(status=201)
        except Exception as e:
            return Response("Failed to create a user: {}".format(e), status=400)

    @decorators.action(methods=["post"], detail=False)
    def createsuperuser(self, request):
        """
        Given a username, full name and password, create a superuser attached
        to the facility that was imported (or create a facility with given facility_name)
        """
        # TODO Default facility name?
        facility_name = request.data.get("facility_name", "Personal")

        # Get the imported facility (assuming its the only one at this point)
        the_facility = Facility.get_or_create(facility_name=facility_name)
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
        After creating/importing a Facility and designating/creating a super admins,
        provision the device using that facility
        """

        # TODO validate the data
        device_name = request.data.get("device_name", "")
        language_id = request.data.get("language_id", "")
        is_provisioned = request.data.get("is_provisioned", False)

        # Get the created/imported facility (assuming its the only one at this point)
        the_facility = Facility.objects.first()

        # Use the facility's preset to determine whether to allow guest access
        allow_guest_access = the_facility.dataset.preset != "formal"

        # Finally: Call provision_device
        provision_device(
            device_name=device_name,
            language_id=language_id,
            default_facility=the_facility,
            allow_guest_access=allow_guest_access,
            is_provisioned=is_provisioned,
        )

        return Response({"is_provisioned": is_provisioned})


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
            {"full_name": user.full_name, "username": user.username, "id": user.id}
            for user in queryset
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
        to the facility that was imported (or create a facility with given facility_name)
        """
        facility_name = request.data.get("facility_name", None)

        # Get the imported facility (assuming its the only one at this point)
        if Facility.objects.count() == 0:
            the_facility = Facility.objects.create(name=facility_name)
        else:
            the_facility = Facility.objects.get()
            if facility_name:
                the_facility.name = facility_name
                the_facility.save()

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
    def provisionosuserdevice(self, request):
        """
        When we can get the OS user, this is what we'll call to provision the device
        TODO FIXME
        """

        device_name = request.data.get("device_name", "")  # noqa
        language_id = request.data.get("language_id", "")  # noqa
        is_provisioned = request.data.get("is_provisioned", False)  # noqa

    @decorators.action(methods=["post"], detail=False)
    def provisiondevice(self, request):
        """
        After creating/importing a Facility and designating/creating a super admins,
        provision the device using that facility
        """

        # TODO validate the data
        device_name = request.data.get("device_name", "")
        language_id = request.data.get("language_id", "")
        is_provisioned = request.data.get("is_provisioned", False)

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
            is_provisioned=is_provisioned,
        )

        return Response({"is_provisioned": is_provisioned})

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
        facility_info = get_remote_users_info(request)
        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            raise PermissionDenied()
        students = [u for u in facility_info["users"] if not u["roles"]]
        return Response({"students": students, "admin": facility_info["user"]})


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
