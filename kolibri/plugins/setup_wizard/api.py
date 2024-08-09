from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import decorators
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
from kolibri.core.device.models import DevicePermissions
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure


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
        client = NetworkClient.build_for_address(baseurl)
        api_url = reverse("kolibri:core:publicsignup-list")
        payload = {
            # N.B. facility is keyed by facility not facility_id on the signup
            # viewset serializer.
            FACILITY_CREDENTIAL_KEY: facility_id,
            "username": username,
            "password": password,
            "full_name": full_name,
        }
        try:
            r = client.post(api_url, data=payload)
        except NetworkLocationResponseFailure as e:
            r = e.response
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
