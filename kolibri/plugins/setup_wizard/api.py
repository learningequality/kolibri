import requests
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import decorators
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.models import DevicePermissions


# Basic class that makes these endpoints unusable if device is provisioned
class HasPermissionDuringSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import device_provisioned

        return not device_provisioned()


class HasPermissionDuringLODSetup(BasePermission):
    def has_permission(self, request, view):
        from kolibri.core.device.utils import get_device_setting

        return get_device_setting("subset_of_users_device")


@method_decorator(csrf_protect, name="dispatch")
class SetupWizardResource(ViewSet):
    """
    Generic endpoints for use during various setup wizard onboarding flows
    """

    permission_classes = (HasPermissionDuringSetup,)

    @decorators.action(methods=["post"], detail=False)
    def createuseronremote(self, request):
        facility_id = request.data.get("facility_id", None)
        username = request.data.get("username", None)
        password = request.data.get("password", None)
        full_name = request.data.get("full_name", "")
        baseurl = request.data.get("baseurl", None)

        api_url = reverse("kolibri:core:publicsignup-list")

        url = "{}{}".format(baseurl, api_url)

        payload = {
            # N.B. facility is keyed by facility not facility_id on the signup
            # viewset serializer.
            FACILITY_CREDENTIAL_KEY: facility_id,
            "username": username,
            "password": password,
            "full_name": full_name,
        }

        r = requests.post(url, data=payload)
        return Response({"status": r.status_code, "data": r.content})


@method_decorator(csrf_protect, name="dispatch")
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
        facility_id = request.data.get("facility_id")
        baseurl = request.data.get("baseurl")
        password = request.data.get("password")
        username = request.data.get("username")
        try:
            facility_info = get_remote_users_info(
                baseurl, facility_id, username, password
            )
        except AuthenticationFailed:
            raise PermissionDenied()
        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            raise PermissionDenied()
        students = [u for u in facility_info["users"] if not u["roles"]]
        return Response({"students": students, "admin": facility_info["user"]})
