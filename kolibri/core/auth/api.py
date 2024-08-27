import logging
import time
from datetime import datetime
from datetime import timedelta
from itertools import groupby
from uuid import UUID
from uuid import uuid4

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError
from django.db.models import Func
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import TextField
from django.db.models import Value
from django.db.models.functions import Cast
from django.http import Http404
from django.http import HttpResponseBadRequest
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from django_filters.rest_framework import UUIDFilter
from morango.api.permissions import BasicMultiArgumentAuthentication
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import TransferSession
from rest_framework import decorators
from rest_framework import filters
from rest_framework import permissions
from rest_framework import serializers
from rest_framework import status
from rest_framework import views
from rest_framework import viewsets
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ValidationError as RestValidationError
from rest_framework.mixins import CreateModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .constants import collection_kinds
from .constants import role_kinds
from .models import Classroom
from .models import Collection
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .serializers import ClassroomSerializer
from .serializers import CreateFacilitySerializer
from .serializers import ExtraFieldsSerializer
from .serializers import FacilityDatasetSerializer
from .serializers import FacilitySerializer
from .serializers import FacilityUserSerializer
from .serializers import LearnerGroupSerializer
from .serializers import MembershipSerializer
from .serializers import PublicFacilitySerializer
from .serializers import RoleSerializer
from kolibri.core import error_constants
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesViewset
from kolibri.core.api import ValuesViewsetOrderingFilter
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility
from kolibri.core.auth.permissions.general import DenyAll
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.utils import allow_guest_access
from kolibri.core.device.utils import allow_other_browsers_to_connect
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import is_full_facility_import
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.core.query import annotate_array_aggregate
from kolibri.core.query import SQCount
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.utils.pagination import ValuesViewsetPageNumberPagination
from kolibri.core.utils.urls import reverse_path
from kolibri.plugins.app.utils import interface
from kolibri.utils.urls import validator

logger = logging.getLogger(__name__)


class OptionalPageNumberPagination(ValuesViewsetPageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"


class KolibriAuthPermissionsFilter(filters.BaseFilterBackend):
    """
    A Django REST Framework filter backend that limits results to those where the
    requesting user has read object level permissions. This filtering is delegated
    to the ``filter_readable`` method on ``KolibriAbstractBaseUser``.
    """

    def filter_queryset(self, request, queryset, view):
        if request.method == "GET":
            # If a 'GET' method only return readable items to filter down the queryset.
            return request.user.filter_readable(queryset)
        # otherwise, return the full queryset, as permission checks will happen object-by-object
        # (and filtering here then leads to 404's instead of the more correct 403's)
        return queryset


def _ensure_raw_dict(d):
    if hasattr(d, "dict"):
        d = d.dict()
    return dict(d)


class KolibriAuthPermissions(permissions.BasePermission):
    """
    A Django REST Framework permissions class that defers to Kolibri's permissions
    system to determine object-level permissions.
    """

    def validator(self, request, view, datum):
        model = view.get_serializer_class().Meta.model
        validated_data = view.get_serializer().to_internal_value(
            _ensure_raw_dict(datum)
        )
        return request.user.can_create(model, validated_data)

    def has_permission(self, request, view):

        # as `has_object_permission` isn't called for POST/create, we need to check here
        if request.method == "POST" and request.data:
            if type(request.data) is list:
                data = request.data
            else:
                data = [request.data]

            return all(self.validator(request, view, datum) for datum in data)

        # for other methods, we return True, as their permissions get checked below
        return True

    def has_object_permission(self, request, view, obj):
        # note that there is no entry for POST here, as creation is handled by `has_permission`, above
        if request.method in permissions.SAFE_METHODS:  # 'GET', 'OPTIONS' or 'HEAD'
            return request.user.can_read(obj)
        if request.method in ["PUT", "PATCH"]:
            return request.user.can_update(obj)
        if request.method == "DELETE":
            return request.user.can_delete(obj)
        return False


class IsPINValidPermissions(DenyAll):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.can_manage_content

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class FacilityDatasetFilter(FilterSet):

    facility_id = UUIDFilter(field_name="collection")

    class Meta:
        model = FacilityDataset
        fields = ["facility_id"]


def _is_full_facility_import(dataset):
    return is_full_facility_import(dataset["id"])


class FacilityDatasetViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = FacilityDatasetFilter
    serializer_class = FacilityDatasetSerializer

    values = (
        "id",
        "learner_can_edit_username",
        "learner_can_edit_name",
        "learner_can_edit_password",
        "learner_can_sign_up",
        "learner_can_delete_account",
        "learner_can_login_with_no_password",
        "show_download_button_in_learn",
        "extra_fields",
        "description",
        "location",
        "registered",
        "preset",
    )

    field_map = {
        "allow_guest_access": lambda x: allow_guest_access(),
        "is_full_facility_import": _is_full_facility_import,
    }

    def get_queryset(self):
        return FacilityDataset.objects.filter(
            collection__kind=collection_kinds.FACILITY
        )

    @decorators.action(methods=["post"], detail=True)
    def resetsettings(self, request, pk):
        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            if not request.user.can_update(dataset):
                raise PermissionDenied("You cannot reset this facility's settings")
            dataset.reset_to_default_settings()
            data = FacilityDatasetSerializer(dataset).data
            return Response(data)
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility does not exist")

    @decorators.action(methods=["post", "patch"], detail=True, url_path="update-pin")
    def update_pin(self, request, pk):

        serializer = ExtraFieldsSerializer(data=request.data)
        if not serializer.is_valid():
            return HttpResponseBadRequest("Invalid pin input")

        pin_code = serializer.data.get("pin_code")
        if request.method == "POST" and not pin_code:
            return HttpResponseBadRequest("Please provide a pin")

        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            if dataset.extra_fields is None:
                dataset.extra_fields = {}
            dataset.extra_fields["pin_code"] = pin_code
            dataset.save()
            return Response(FacilityDatasetSerializer(dataset).data)
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility not found")


class IsPINValidView(views.APIView):
    permission_classes = (IsPINValidPermissions,)

    def post(self, request, pk):
        serializer = ExtraFieldsSerializer(data=request.data)
        if not serializer.is_valid() or serializer.data.get("pin_code") is None:
            return HttpResponseBadRequest("Invalid pin input")

        input_pin_code = serializer.data.get("pin_code")
        if not input_pin_code:
            return HttpResponseBadRequest("Please provide a pin")

        try:
            dataset = FacilityDataset.objects.get(pk=pk)
            data = FacilityDatasetSerializer(dataset).data
            extra_fields = data.get("extra_fields", {})
            saved_pin_code = extra_fields.get("pin_code")
        except FacilityDataset.DoesNotExist:
            raise Http404("Facility not found")

        return Response({"is_pin_valid": saved_pin_code == input_pin_code})


class FacilityUserFilter(FilterSet):

    USER_TYPE_CHOICES = (
        ("learner", "learner"),
        ("superuser", "superuser"),
    ) + role_kinds.choices

    member_of = ModelChoiceFilter(
        method="filter_member_of", queryset=Collection.objects.all()
    )
    user_type = ChoiceFilter(
        choices=USER_TYPE_CHOICES,
        method="filter_user_type",
    )
    exclude_member_of = ModelChoiceFilter(
        method="filter_exclude_member_of", queryset=Collection.objects.all()
    )
    exclude_coach_for = ModelChoiceFilter(
        method="filter_exclude_coach_for", queryset=Collection.objects.all()
    )
    exclude_user_type = ChoiceFilter(
        choices=USER_TYPE_CHOICES,
        method="filter_exclude_user_type",
    )

    def filter_member_of(self, queryset, name, value):
        return queryset.filter(Q(memberships__collection=value) | Q(facility=value))

    def filter_user_type(self, queryset, name, value):
        if value == "learner":
            return queryset.filter(roles__isnull=True)
        if value == "superuser":
            return queryset.filter(devicepermissions__is_superuser=True)
        return queryset.filter(roles__kind=value)

    def filter_exclude_member_of(self, queryset, name, value):
        return queryset.exclude(Q(memberships__collection=value) | Q(facility=value))

    def filter_exclude_coach_for(self, queryset, name, value):
        return queryset.exclude(
            Q(roles__in=Role.objects.filter(kind=role_kinds.COACH, collection=value))
        )

    def filter_exclude_user_type(self, queryset, name, value):
        if value == "learner":
            return queryset.exclude(roles__isnull=True)
        if value == "superuser":
            return queryset.exclude(devicepermissions__is_superuser=True)
        return queryset.exclude(roles__kind=value)

    class Meta:
        model = FacilityUser
        fields = ["member_of", "user_type", "exclude_member_of", "exclude_user_type"]


class PublicFacilityUserViewSet(ReadOnlyValuesViewset):
    queryset = FacilityUser.objects.all()
    authentication_classes = [BasicMultiArgumentAuthentication]
    permission_classes = [IsAuthenticated]
    values = (
        "id",
        "username",
        "full_name",
        "facility",
        "roles__kind",
        "devicepermissions__is_superuser",
        "id_number",
        "gender",
        "birth_year",
    )
    field_map = {
        "is_superuser": lambda x: bool(x.pop("devicepermissions__is_superuser")),
    }

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return FacilityUser.objects.none()
        facility_id = self.request.query_params.get(
            "facility_id", self.request.user.facility_id
        )
        try:
            facility_id = UUID(facility_id).hex
        except ValueError:
            return self.queryset.none()

        # if user has admin rights for the facility returns the list of users
        queryset = self.queryset.filter(facility_id=facility_id)
        # otherwise, the endpoint returns only the user information
        if not self.request.user.is_superuser and not _user_is_admin_for_own_facility(
            self.request.user
        ):
            queryset = queryset.filter(id=self.request.user.id)

        return queryset

    def consolidate(self, items, queryset):
        output = []
        items = sorted(items, key=lambda x: x["id"])
        for key, group in groupby(items, lambda x: x["id"]):
            roles = []
            for item in group:
                role = item.pop("roles__kind")
                if role is not None:
                    roles.append(role)
            item["roles"] = roles
            output.append(item)
        return output


class FacilityUserViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    pagination_class = OptionalPageNumberPagination
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.SearchFilter,
        ValuesViewsetOrderingFilter,
    )
    order_by_field = "username"

    queryset = FacilityUser.objects.all().order_by(order_by_field)
    serializer_class = FacilityUserSerializer
    filterset_class = FacilityUserFilter
    search_fields = ("username", "full_name")

    values = (
        "id",
        "username",
        "full_name",
        "facility",
        "roles__kind",
        "roles__collection",
        "roles__id",
        "devicepermissions__is_superuser",
        "id_number",
        "gender",
        "birth_year",
        "extra_demographics",
        "date_joined",
    )

    ordering_fields = (
        "id",
        "username",
        "full_name",
        "gender",
        "birth_year",
        "date_joined",
    )

    field_map = {
        "is_superuser": lambda x: bool(x.pop("devicepermissions__is_superuser"))
    }

    def consolidate(self, items, queryset):
        output = []
        items = sorted(items, key=lambda x: x["id"])
        ordering_param = self.request.query_params.get("ordering", self.order_by_field)
        reverse = False
        for key, group in groupby(items, lambda x: x["id"]):
            roles = []
            for item in group:
                role = {
                    "collection": item.pop("roles__collection"),
                    "kind": item.pop("roles__kind"),
                    "id": item.pop("roles__id"),
                }
                if role["collection"]:
                    # Our values call will return null for users with no assigned roles
                    # So filter them here.
                    roles.append(role)
            item["roles"] = roles
            output.append(item)
            if ordering_param.startswith("-"):
                ordering_param = ordering_param[1:]
                reverse = True

        output = sorted(output, key=lambda x: x[ordering_param], reverse=reverse)
        return output

    def perform_update(self, serializer):
        instance = serializer.save()
        # if the user is updating their own password, ensure they don't get logged out
        if self.request.user == instance:
            update_session_auth_hash(self.request, instance)


class SanitizeInputsSerializer(serializers.Serializer):
    username = serializers.CharField()
    facility = HexOnlyUUIDField()


class UsernameAvailableView(views.APIView):
    def post(self, request):
        serializer = SanitizeInputsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        facility_id = serializer.validated_data["facility"]
        if not username or not facility_id:
            return Response(
                "Must specify username, and facility",
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            Facility.objects.get(id=facility_id)
        except (ValueError, ObjectDoesNotExist):
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


class FacilityUsernameViewSet(ReadOnlyValuesViewset):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ("facility",)
    search_fields = ("^username",)

    values = ("username",)

    def get_queryset(self):
        if valid_app_key_on_request(self.request):
            # Special case for app context to return usernames for
            # the list display
            return FacilityUser.objects.all()
        return FacilityUser.objects.filter(
            dataset__learner_can_login_with_no_password=True, roles=None
        ).filter(
            Q(devicepermissions__is_superuser=False) | Q(devicepermissions__isnull=True)
        )


class MembershipFilter(FilterSet):
    user_ids = CharFilter(method="filter_user_ids")

    def filter_user_ids(self, queryset, name, value):
        return queryset.filter(user_id__in=value.split(","))

    class Meta:
        model = Membership
        fields = ["user", "collection", "user_ids"]


class MembershipViewSet(BulkDeleteMixin, BulkCreateMixin, viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    filterset_class = MembershipFilter
    filterset_fields = ["user", "collection", "user_ids"]


class RoleFilter(FilterSet):
    user_ids = CharFilter(method="filter_user_ids")

    def filter_user_ids(self, queryset, name, value):
        return queryset.filter(user_id__in=value.split(","))

    class Meta:
        model = Role
        fields = ["user", "collection", "kind", "user_ids"]


class RoleViewSet(BulkDeleteMixin, BulkCreateMixin, viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    filterset_class = RoleFilter
    filterset_fields = ["user", "collection", "kind", "user_ids"]


dataset_keys = [
    "dataset__id",
    "dataset__learner_can_edit_username",
    "dataset__learner_can_edit_name",
    "dataset__learner_can_edit_password",
    "dataset__learner_can_sign_up",
    "dataset__learner_can_delete_account",
    "dataset__learner_can_login_with_no_password",
    "dataset__show_download_button_in_learn",
    "dataset__extra_fields",
    "dataset__description",
    "dataset__location",
    "dataset__registered",
    "dataset__preset",
]


# map function to pop() all of the dataset__ items into an dict
# then assign that new dict to the `dataset` key of the facility
def _map_dataset(facility):
    dataset = {}
    for dataset_key in dataset_keys:
        stripped_key = dataset_key.replace("dataset__", "")
        dataset[stripped_key] = facility.pop(dataset_key)
    return dataset


class FacilityViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

    facility_values = [
        "id",
        "name",
        "num_classrooms",
        "num_users",
        "last_successful_sync",
        "last_failed_sync",
    ]

    values = tuple(facility_values + dataset_keys)

    field_map = {"dataset": _map_dataset}

    def annotate_queryset(self, queryset):
        transfer_session_dataset_filter = Func(
            Cast(OuterRef("dataset"), TextField()),
            Value("-"),
            Value(""),
            function="replace",
            output_field=TextField(),
        )

        return (
            queryset.annotate(
                num_users=SQCount(
                    FacilityUser.objects.filter(facility=OuterRef("id")), field="id"
                )
            )
            .annotate(
                num_classrooms=SQCount(
                    Classroom.objects.filter(parent=OuterRef("id")), field="id"
                )
            )
            .annotate(
                last_successful_sync=Subquery(
                    # the sync command does a pull, then a push, so if the push succeeded,
                    # the pull likely did too, which means this should represent when the
                    # facility was last fully and successfully synced
                    TransferSession.objects.filter(
                        push=True,
                        active=False,
                        transfer_stage=transfer_stages.CLEANUP,
                        transfer_stage_status=transfer_statuses.COMPLETED,
                        filter=transfer_session_dataset_filter,
                    )
                    .order_by("-last_activity_timestamp")
                    .values("last_activity_timestamp")[:1]
                )
            )
            .annotate(
                last_failed_sync=Subquery(
                    # Here we simply look for if any transfer session has errored
                    TransferSession.objects.filter(
                        transfer_stage_status=transfer_statuses.ERRORED,
                        filter=transfer_session_dataset_filter,
                    )
                    .order_by("-last_activity_timestamp")
                    .values("last_activity_timestamp")[:1]
                )
            )
        )

    @decorators.action(methods=["post"], detail=False, permission_classes=[IsSuperuser])
    def create_facility(self, request):
        serializer = CreateFacilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response()


class PublicFacilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = PublicFacilitySerializer


class ClassroomFilter(FilterSet):

    role = CharFilter(method="filter_has_role_for")
    parent = ModelChoiceFilter(queryset=Facility.objects.all())

    def filter_has_role_for(self, queryset, name, value):
        requesting_user = self.request.user
        if requesting_user.is_superuser:
            return queryset

        if requesting_user.is_anonymous:
            return queryset.none()

        # filter queryset by admin role and coach role
        roles = requesting_user.roles.exclude(kind=role_kinds.ASSIGNABLE_COACH)

        if roles.filter(
            collection_id=requesting_user.facility_id, kind=role_kinds.ADMIN
        ).exists():
            return queryset

        if value == role_kinds.COACH:
            roles = roles.filter(kind=value)

        return queryset.filter(
            Q(id__in=roles.values("collection_id"))
            | Q(parent_id__in=roles.values("collection_id"))
        )

    class Meta:
        model = Classroom
        fields = ["role", "parent"]


class ClassroomViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer
    filterset_class = ClassroomFilter

    values = (
        "id",
        "name",
        "parent",
        "learner_count",
        "role__user__id",
        "role__user__devicepermissions__is_superuser",
        "role__user__full_name",
        "role__user__username",
    )

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            learner_count=SQCount(
                FacilityUser.objects.filter(memberships__collection=OuterRef("id")),
                field="id",
            )
        )

    def consolidate(self, items, queryset):
        output = []
        items = sorted(items, key=lambda x: x["id"])
        coach_ids = list(
            set(
                [
                    item["role__user__id"]
                    for item in items
                    if item["role__user__id"] is not None
                ]
            )
        )
        facility_roles = {
            obj.pop("user"): obj
            for obj in Role.objects.filter(
                user_id__in=coach_ids, collection__kind=collection_kinds.FACILITY
            ).values("user", "kind", "collection", "id")
        }
        for key, group in groupby(items, lambda x: x["id"]):
            coaches = []
            for item in group:
                user_id = item.pop("role__user__id")
                if (
                    user_id in facility_roles
                    and facility_roles[user_id]["collection"] == item["parent"]
                ):
                    roles = [facility_roles[user_id]]
                else:
                    roles = []
                coach = {
                    "id": user_id,
                    "facility": item["parent"],
                    # Coerce to bool if None
                    "is_superuser": bool(
                        item.pop("role__user__devicepermissions__is_superuser")
                    ),
                    "full_name": item.pop("role__user__full_name"),
                    "username": item.pop("role__user__username"),
                    "roles": roles,
                }
                if coach["id"]:
                    coaches.append(coach)
            item["coaches"] = coaches
            output.append(item)
        return output


class LearnerGroupViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer

    filterset_fields = ("parent",)

    values = ("id", "name", "parent", "user_ids")

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(queryset, user_ids="membership__user__id")


class BaseSignUpViewSet(viewsets.GenericViewSet, CreateModelMixin):
    serializer_class = FacilityUserSerializer

    def check_can_signup(self, serializer):
        """
        Check if the user can sign up to the specified facility.
        """
        facility = serializer.validated_data["facility"]
        if (
            not facility.dataset.learner_can_sign_up
            or not facility.dataset.full_facility_import
        ):
            raise PermissionDenied("Cannot sign up to this facility")

    def perform_create(self, serializer):
        """
        Handle the creation of a new user, including validation and logging in.
        """
        self.check_can_signup(serializer)
        serializer.save()
        data = serializer.validated_data
        authenticated_user = authenticate(
            username=data["username"],
            password=data["password"],
            facility=data["facility"],
        )
        login(self.request, authenticated_user)


@method_decorator(csrf_protect, name="dispatch")
class SignUpViewSet(BaseSignUpViewSet):
    """
    Viewset for signing up a user with CSRF protection.
    """

    pass


@method_decorator(csrf_exempt, name="dispatch")
class PublicSignUpViewSet(BaseSignUpViewSet):
    """
    Identical to the SignUpViewset except that it does not login the user.
    This endpoint is intended to allow a FacilityUser in a different facility
    on another device to be cloned into a facility on this device, to facilitate
    moving a user from one facility to another.

    It also allows for historic serializer classes in the case that we
    make an update to our implementation, and we want to keep the API stable.
    """

    legacy_serializer_classes = []

    def create(self, request, *args, **kwargs):
        exception = None
        serializer_kwargs = dict(data=request.data)
        serializer_kwargs.setdefault("context", self.get_serializer_context())
        for serializer_class in [
            self.serializer_class
        ] + self.legacy_serializer_classes:
            serializer = serializer_class(**serializer_kwargs)
            try:
                serializer.is_valid(raise_exception=True)
                break
            except Exception as e:
                exception = e
        if exception:
            raise exception
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        self.check_can_signup(serializer)
        serializer.save()


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


@method_decorator([ensure_csrf_cookie], name="dispatch")
class SessionViewSet(viewsets.ViewSet):
    def _check_os_user(self, request, username):
        auth_token = request.COOKIES.get(APP_AUTH_TOKEN_COOKIE_NAME)
        if auth_token:
            try:
                user = FacilityUser.objects.get_or_create_os_user(auth_token)
                if user is not None and user.username == username:
                    return user
            except ValidationError as e:
                logger.error(e)

    def create(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        facility_id = request.data.get("facility", None)

        # Only enforce this when running in an app
        if (
            interface.enabled
            and not allow_other_browsers_to_connect()
            and not valid_app_key_on_request(request)
        ):
            return Response(
                [{"id": error_constants.INVALID_CREDENTIALS, "metadata": {}}],
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = None
        if interface.enabled and valid_app_key_on_request(request):
            # If we are in app context, then try to get the automatically created OS User
            # if it matches the username, without needing a password.
            user = self._check_os_user(request, username)
        if user is None:
            # Otherwise attempt full authentication
            user = authenticate(
                username=username, password=password, facility=facility_id
            )
        if user is not None and user.is_active:
            # Correct password, and the user is marked "active"
            login(request, user)
            # Success!
            return self.get_session_response(request)
        # Otherwise, try to give a helpful error message
        # Find the FacilityUser we're looking for
        try:
            unauthenticated_user = FacilityUser.objects.get(
                username__iexact=username, facility=facility_id
            )
        except (ValueError, ObjectDoesNotExist):
            return Response(
                [
                    {
                        "id": error_constants.NOT_FOUND,
                        "metadata": {
                            "field": "username",
                            "message": "Username not found.",
                        },
                    }
                ],
                status=status.HTTP_400_BAD_REQUEST,
            )
        except FacilityUser.MultipleObjectsReturned:
            # Handle case of multiple matching usernames
            unauthenticated_user = FacilityUser.objects.filter(
                username__exact=username, facility=facility_id
            ).first()
        if unauthenticated_user.password == NOT_SPECIFIED and not hasattr(
            unauthenticated_user, "os_user"
        ):
            # Here - we have a Learner whose password is "NOT_SPECIFIED" because they were created
            # while the "Require learners to log in with password" setting was disabled - but now
            # it is enabled again.
            # Alternatively, they may have been created as an OSUser for automatic login with an
            # authentication token. If this is the case, then we do not allow for the password to be set.
            return Response(
                [
                    {
                        "id": error_constants.PASSWORD_NOT_SPECIFIED,
                        "metadata": {
                            "field": "password",
                            "message": "Username is valid, but password needs to be set before login.",
                        },
                    }
                ],
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            not password
            and FacilityUser.objects.filter(
                username__iexact=username, facility=facility_id
            ).exists()
        ):
            # Password was missing, but username is valid, prompt to give password
            return Response(
                [
                    {
                        "id": error_constants.MISSING_PASSWORD,
                        "metadata": {
                            "field": "password",
                            "message": "Username is valid, but password is missing.",
                        },
                    }
                ],
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Respond with error
        return Response(
            [{"id": error_constants.INVALID_CREDENTIALS, "metadata": {}}],
            status=status.HTTP_401_UNAUTHORIZED,
        )

    def destroy(self, request, pk=None):
        logout(request)
        return Response([])

    def update(self, request, pk=None):
        return self.get_session_response(request)

    def get_session_response(self, request):
        user = request.user
        session_key = "current"
        server_time = now()
        session = user.session_data
        session.update(
            {
                "id": session_key,
                "server_time": server_time,
                "app_context": valid_app_key_on_request(request),
            }
        )

        visitor_cookie_expiry = datetime.utcnow() + timedelta(days=365)

        if isinstance(user, AnonymousUser):
            response = Response(session)
            if not request.COOKIES.get("visitor_id"):
                visitor_id = str(uuid4().hex)
                response.set_cookie(
                    "visitor_id", visitor_id, expires=visitor_cookie_expiry
                )
            else:
                response.set_cookie(
                    "visitor_id",
                    request.COOKIES.get("visitor_id"),
                    expires=visitor_cookie_expiry,
                )
            return response
        # Set last activity on session to the current time to prevent session timeout
        # Only do this for logged in users, as anonymous users cannot get logged out!
        request.session["last_session_request"] = int(time.time())
        # Default to active, only assume not active when explicitly set.
        active = request.data.get("active", False)

        # Can only record user session log data for FacilityUsers.
        if active and isinstance(user, FacilityUser):
            UserSessionLog.update_log(
                user,
                os_info=request.data.get("os"),
                browser_info=request.data.get("browser"),
            )

        response = Response(session)
        return response


class RemoteFacilityUserViewset(views.APIView):
    def get(self, request):
        baseurl = request.query_params.get("baseurl", "")
        try:
            validator(baseurl)
        except ValidationError as e:
            raise RestValidationError(detail=str(e))
        username = request.query_params.get("username", None)
        facility = request.query_params.get("facility", None)
        if username is None or facility is None:
            raise RestValidationError(detail="Both username and facility are required")
        client = NetworkClient.build_for_address(baseurl)
        url = reverse_path("kolibri:core:publicsearchuser-list")
        try:
            response = client.get(
                url, params={"facility": facility, "search": username}
            )
            return Response(response.json())
        except NetworkLocationResponseFailure:
            return Response({})
        except Exception as e:
            raise RestValidationError(detail=str(e))


class RemoteFacilityUserAuthenticatedViewset(views.APIView):
    def post(self, request):
        """
        If the request is done by an admin user  it will return a list of the users of the
        facility

        :param baseurl: First part of the url of the server that's going to be requested
        :param facility_id: Id of the facility to authenticate and get the list of users
        :param username: Username of the user that's going to authenticate
        :param password: Password of the user that's going to authenticate
        :return: List of the users of the facility.
        """
        baseurl = request.data.get("baseurl", "")
        try:
            validator(baseurl)
        except ValidationError as e:
            raise RestValidationError(detail=str(e))
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

        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            return Response([user_info])
        return Response(facility_info["users"])
