import logging

from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.http import HttpResponseBadRequest
from rest_framework import serializers
from rest_framework import status
from rest_framework import views
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ValidationError as RestValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from kolibri.core import error_constants
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions.general import DenyAll
from kolibri.core.auth.utils.delete import delete_imported_user
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.utils.urls import reverse_path

from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from .facility_dataset import ExtraFieldsSerializer

logger = logging.getLogger(__name__)


class IsPINValidPermissions(DenyAll):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.can_manage_content

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsPINValidView(views.APIView):
    permission_classes = (IsPINValidPermissions,)

    def post(self, request, pk):
        serializer = ExtraFieldsSerializer(data=request.data)
        if not serializer.is_valid() or serializer.data.get("pin_code") is None:
            return HttpResponseBadRequest("Invalid pin input")
        input_pin_code = serializer.data["pin_code"]

        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            saved_pin_code = (dataset.extra_fields or {}).get("pin_code")
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility not found")

        return Response({"is_pin_valid": saved_pin_code == input_pin_code})


class SanitizeInputsSerializer(serializers.Serializer):
    username = serializers.CharField()
    facility = HexOnlyUUIDField()


class UsernameAvailableView(views.APIView):
    def post(self, request):
        serializer = SanitizeInputsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        facility_id = serializer.validated_data["facility"]

        if not Facility.objects.filter(id=facility_id).exists():
            return Response(
                "Facility not found",
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            FacilityUser.objects.get(username__iexact=username, facility=facility_id)
            return Response(
                [
                    {
                        "id": error_constants.USERNAME_ALREADY_EXISTS,
                        "metadata": {
                            "field": "username",
                            "message": "Username already exists.",
                        },
                    }
                ],
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ObjectDoesNotExist:
            return Response(True, status=status.HTTP_200_OK)


class UserIdParamSerializer(serializers.Serializer):
    user_id = HexOnlyUUIDField()


class DeleteImportedUserView(views.APIView):
    permission_classes = [KolibriAuthPermissions]

    def delete(self, request, user_id):
        serializer = UserIdParamSerializer(data={"user_id": user_id})
        serializer.is_valid(raise_exception=True)

        validated_user_id = serializer.validated_data["user_id"]
        try:
            user = FacilityUser.objects.get(id=validated_user_id)
            self.check_object_permissions(request, user)

            delete_imported_user(user)

            return Response({"user_id": user.id})
        except FacilityUser.DoesNotExist:
            raise Http404("User does not exist")


class SetNonSpecifiedPasswordView(views.APIView):
    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        facility_id = request.data.get("facility", None)

        if not username or not password or not facility_id:
            return Response(
                "Must specify username, password, and facility",
                status=status.HTTP_400_BAD_REQUEST,
            )

        error_message = "Suitable user does not exist"

        try:
            user = FacilityUser.objects.get(username=username, facility=facility_id)
        except (ValueError, ObjectDoesNotExist):
            raise Http404(error_message)

        if user.password != NOT_SPECIFIED or hasattr(user, "os_user"):
            raise Http404(error_message)

        user.set_password(password)
        user.save()

        return Response()


class _RemoteFacilityUserSearchSerializer(serializers.Serializer):
    id = serializers.UUIDField(format="hex", allow_null=True)
    username = serializers.CharField()


class RemoteFacilityUserViewset(views.APIView):
    permission_classes = [IsAuthenticated | NotProvisionedHasPermission]

    def get(self, request):
        baseurl = request.query_params.get("baseurl", "")
        username = request.query_params.get("username", None)
        facility = request.query_params.get("facility", None)
        if username is None or facility is None:
            raise RestValidationError(detail="Both username and facility are required")
        try:
            client = NetworkClient.build_for_address(baseurl)
        except NetworkLocationNotFound:
            raise RestValidationError(detail=f"Unknown peer: {baseurl}")
        url = reverse_path("kolibri:core:publicsearchuser-list")
        try:
            response = client.get(
                url, params={"facility": facility, "search": username}
            )
            serializer = _RemoteFacilityUserSearchSerializer(
                data=response.json(), many=True
            )
            valid = serializer.is_valid()
            return Response(serializer.data if valid else [])
        except NetworkLocationResponseFailure:
            return Response([])
        except Exception as e:
            raise RestValidationError(detail="Remote user lookup failed") from e


class RemoteFacilityUserAuthenticatedViewset(views.APIView):
    permission_classes = [IsAuthenticated | NotProvisionedHasPermission]

    def post(self, request):
        baseurl = request.data.get("baseurl", "")
        username = request.data.get("username", None)
        facility_id = request.data.get("facility_id", None)
        password = request.data.get("password", None)
        if username is None or facility_id is None:
            raise RestValidationError(detail="Both username and facility are required")

        try:
            facility_info = get_remote_users_info(
                baseurl, facility_id, username, password
            )
        except AuthenticationFailed:
            raise PermissionDenied()
        except NetworkLocationNotFound:
            raise RestValidationError(detail=f"Unknown peer: {baseurl}")

        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            return Response([user_info])
        return Response(facility_info["users"])
