import logging
import time
from collections import OrderedDict
from datetime import timedelta
from uuid import UUID
from uuid import uuid4

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import transaction
from django.db.models import Func
from django.db.models import OuterRef
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
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
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

from kolibri.core import error_constants
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.permissions.general import DenyAll
from kolibri.core.auth.utils.delete import delete_imported_user
from kolibri.core.auth.utils.picture_passwords import are_picture_passwords_exhausted
from kolibri.core.auth.utils.picture_passwords import get_learner_count
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.core.device.utils import allow_other_browsers_to_connect
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.core.query import annotate_array_aggregate
from kolibri.core.query import SQCount
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.utils.pagination import ValuesViewsetPageNumberPagination
from kolibri.core.utils.token_generator import TokenGenerator
from kolibri.core.utils.urls import reverse_path

from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .serializers import CreateFacilitySerializer
from .serializers import ExtraFieldsSerializer
from .serializers import FacilitySerializer
from .serializers import LearnerGroupSerializer
from .serializers import MembershipSerializer
from .serializers import PublicFacilitySerializer
from .serializers import RoleSerializer

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


class IsPINValidView(views.APIView):
    permission_classes = (IsPINValidPermissions,)

    def post(self, request, pk):
        # Inline import: viewsets.facility_dataset imports auth helpers from this module,
        # creating a circular dependency that is broken by deferring this import.
        from kolibri.core.auth.viewsets.facility_dataset import (
            FacilityDatasetSerializer,
        )

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


class UserIdParamSerializer(serializers.Serializer):
    user_id = HexOnlyUUIDField()


class DeleteImportedUserView(views.APIView):
    permission_classes = [KolibriAuthPermissions]

    def delete(self, request, user_id):
        """
        Given a user ID, delete the user from the current facility, and remove
        certificates and corresponding morango records.
        """
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


class MembershipFilter(FilterSet):
    user_ids = CharFilter(method="filter_user_ids")
    by_ids = CharFilter(method="filter_by_ids")

    def filter_user_ids(self, queryset, name, value):
        return queryset.filter(user_id__in=value.split(","))

    def filter_by_ids(self, queryset, name, value):
        return queryset.filter(id__in=value.split(","))

    class Meta:
        model = Membership
        fields = ["user", "collection", "user_ids", "by_ids"]


class MembershipViewSet(BulkDeleteMixin, BulkCreateMixin, viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    filterset_class = MembershipFilter


class RoleFilter(FilterSet):
    user_ids = CharFilter(method="filter_user_ids")
    by_ids = CharFilter(method="filter_by_ids")

    def filter_user_ids(self, queryset, name, value):
        return queryset.filter(user_id__in=value.split(","))

    def filter_by_ids(self, queryset, name, value):
        return queryset.filter(id__in=value.split(","))

    class Meta:
        model = Role
        fields = ["user", "collection", "kind", "user_ids", "by_ids"]


class RoleViewSet(BulkDeleteMixin, BulkCreateMixin, viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    filterset_class = RoleFilter
    filterset_fields = ["user", "collection", "kind", "user_ids"]

    def perform_create(self, serializer):
        with transaction.atomic():
            super().perform_create(serializer)
            instances = serializer.instance
            if not isinstance(instances, list):
                instances = [instances]
            user_ids = [role.user_id for role in instances]
            for user in FacilityUser.objects.filter(
                id__in=user_ids, picture_password__isnull=False
            ):
                user.picture_password = None
                user.save(update_fields=["picture_password"])


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
    "dataset__picture_password_settings",
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


def _facility_num_learners(facility):
    return get_learner_count(facility["dataset__id"])


def _picture_passwords_exhausted(facility):
    return are_picture_passwords_exhausted(facility["dataset__id"])


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

    # regular dict can be used after removal for support of python3.6
    field_map = OrderedDict(
        [
            # must precede _map_dataset since it depends on the dataset ID
            ("num_learners", _facility_num_learners),
            ("picture_passwords_exhausted", _picture_passwords_exhausted),
            ("dataset", _map_dataset),
        ]
    )

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


class LearnerGroupViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = LearnerGroup.objects.all()
    serializer_class = LearnerGroupSerializer

    filterset_fields = ("parent",)

    values = ("id", "name", "parent", "user_ids")

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(
            queryset,
            filter=FacilityUser.get_is_active_q("membership"),
            user_ids="membership__user__id",
        )


class BaseSignUpViewSet(viewsets.GenericViewSet, CreateModelMixin):
    def get_serializer_class(self):
        # Inline import: viewsets.facility_user imports auth helpers from this module,
        # creating a circular dependency that is broken by deferring this import.
        from kolibri.core.auth.viewsets.facility_user import FacilityUserSerializer

        return FacilityUserSerializer

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
            self.get_serializer_class()
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


class CreateSessionSerializer(serializers.Serializer):
    # allow_blank so that picture-password requests can omit username entirely
    username = serializers.CharField(required=False, default=None, allow_blank=True)
    user_id = HexOnlyUUIDField(required=False, default=None)
    password = serializers.CharField(
        default="",
        write_only=True,
        required=False,
        allow_blank=True,
    )
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        default=Facility.get_default_facility,
        required=False,
    )
    auth_token = serializers.CharField(required=False, default=None)
    picture_password = serializers.CharField(
        required=False,
        default=None,
        allow_null=True,
        allow_blank=False,
        # Format is exactly three dot-separated integers, each 1–2 digits
        # (icon indices 0–99), e.g. "3.7.12". min/max_length are a fast
        # pre-check; the regex is the authoritative format constraint.
        min_length=5,
        max_length=8,
        validators=[
            RegexValidator(
                r"^\d{1,2}\.\d{1,2}\.\d{1,2}$",
                message="picture_password must be three dot-separated integers.",
            )
        ],
    )

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        facility = attrs.get("facility")
        user_id = attrs.get("user_id")
        auth_token = attrs.get("auth_token")
        picture_password = attrs.get("picture_password")

        request = self.context.get("request")

        user = None

        # OS User authentication
        if valid_app_key_on_request(request):
            # If we are in app context, then try to get the automatically created OS User
            # if it matches the username, without needing a password.
            user = self._check_os_user(request, username)

        # user_id/auth_token authentication
        if user is None and user_id and auth_token:
            if TokenGenerator().check_token(user_id, auth_token):
                user = FacilityUser.objects.filter(
                    id=user_id, facility=facility
                ).first()

        # picture password authentication
        if user is None and picture_password is not None:
            user = authenticate(
                request, picture_password=picture_password, facility=facility
            )

        # username/password authentication — intentionally skipped when
        # picture_password was supplied (even if picture-password auth failed),
        # so a failed picture-password attempt cannot fall through to a
        # username/password login with whatever credentials were also sent.
        if user is None and picture_password is None:
            user = authenticate(
                request, username=username, password=password, facility=facility
            )

        if user is not None and user.is_active:
            attrs["user"] = user
            return attrs

        # Otherwise, throw a meaningful validation error
        self._throw_validation_error(username, password, facility, picture_password)

    def _check_os_user(self, request, username):
        app_auth_token = request.COOKIES.get(APP_AUTH_TOKEN_COOKIE_NAME)
        if app_auth_token:
            try:
                user = FacilityUser.objects.get_or_create_os_user(app_auth_token)
                if user is not None and user.username == username:
                    return user
            except ValidationError as e:
                logger.error(e)

    def _throw_validation_error(
        self, username, password, facility, picture_password=None
    ):
        """
        Throw a RestValidationError with a helpful error message
        depending on what went wrong with authentication.
        """
        if picture_password is not None:
            raise RestValidationError(
                detail={
                    "picture_password": [
                        {
                            "id": error_constants.NOT_FOUND,
                            "metadata": {
                                "field": "picture_password",
                                "message": "No learner found with that picture password.",
                            },
                        }
                    ]
                }
            )
        # Find the FacilityUser we're looking for
        try:
            unauthenticated_user = FacilityUser.objects.get(
                username__iexact=username, facility=facility
            )
        except (ValueError, ObjectDoesNotExist):
            raise RestValidationError(
                detail={
                    "username": [
                        {
                            "id": error_constants.NOT_FOUND,
                            "metadata": {
                                "field": "username",
                                "message": "Username not found.",
                            },
                        }
                    ]
                }
            )
        except FacilityUser.MultipleObjectsReturned:
            # Handle case of multiple matching usernames
            unauthenticated_user = FacilityUser.objects.filter(
                username__exact=username, facility=facility
            ).first()

        if unauthenticated_user.password == NOT_SPECIFIED and not hasattr(
            unauthenticated_user, "os_user"
        ):
            # Here - we have a Learner whose password is "NOT_SPECIFIED" because they were created
            # while the "Require learners to log in with password" setting was disabled - but now
            # it is enabled again.
            # Alternatively, they may have been created as an OSUser for automatic login with an
            # authentication token. If this is the case, then we do not allow for the password to be set.
            raise RestValidationError(
                detail={
                    "password": [
                        {
                            "id": error_constants.PASSWORD_NOT_SPECIFIED,
                            "metadata": {
                                "field": "password",
                                "message": "Username is valid, but password needs to be set before login.",
                            },
                        }
                    ]
                }
            )

        if (
            not password
            and FacilityUser.objects.filter(
                username__iexact=username, facility=facility
            ).exists()
        ):
            # Password was missing, but username is valid, prompt to give password
            raise RestValidationError(
                detail={
                    "password": [
                        {
                            "id": error_constants.MISSING_PASSWORD,
                            "metadata": {
                                "field": "password",
                                "message": "Username is valid, but password is missing.",
                            },
                        }
                    ]
                }
            )

        # If no other error message was raised, then throw a generic invalid credentials message
        raise RestValidationError(
            detail={
                "non_field_errors": [
                    {
                        "id": error_constants.INVALID_CREDENTIALS,
                        "metadata": {},
                    }
                ]
            }
        )


@method_decorator([ensure_csrf_cookie], name="dispatch")
class SessionViewSet(viewsets.ViewSet):
    def create(self, request):
        # Only enforce this when running in an app
        if not allow_other_browsers_to_connect() and not valid_app_key_on_request(
            request
        ):
            return Response(
                [{"id": error_constants.INVALID_CREDENTIALS, "metadata": {}}],
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = CreateSessionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            if request.query_params.get("prevalidate") == "true":
                return Response({"full_name": user.full_name})
            login(request, user)
            return self.get_session_response(request)

        errors = serializer.errors
        return self._get_error_response(errors)

    def _get_error_response(self, errors):
        """
        Helper method to construct a standardized error response.
        """
        error_list = []
        response_status = status.HTTP_400_BAD_REQUEST
        for field, field_errors in errors.items():
            for error in field_errors:
                error_list.append(error)
                if (
                    isinstance(error, dict)
                    and error.get("id") == error_constants.INVALID_CREDENTIALS
                ):
                    response_status = status.HTTP_401_UNAUTHORIZED

        return Response(error_list, status=response_status)

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

        visitor_cookie_expiry = now() + timedelta(days=365)

        if isinstance(user, AnonymousUser):
            response = Response(session)
            try:
                visitor_id = request.COOKIES.get("visitor_id")
                visitor_id = UUID(visitor_id, version=4).hex
            except (ValueError, TypeError):
                visitor_id = uuid4().hex
            response.set_cookie("visitor_id", visitor_id, expires=visitor_cookie_expiry)
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
            raise RestValidationError(detail="Unknown peer: {}".format(baseurl))
        url = reverse_path("kolibri:core:publicsearchuser-list")
        try:
            response = client.get(
                url, params={"facility": facility, "search": username}
            )
            serializer = _RemoteFacilityUserSearchSerializer(
                data=response.json(), many=True
            )
            return Response(serializer.data if serializer.is_valid() else [])
        except NetworkLocationResponseFailure:
            return Response([])
        except Exception as e:
            raise RestValidationError(detail="Remote user lookup failed") from e


class RemoteFacilityUserAuthenticatedViewset(views.APIView):
    permission_classes = [IsAuthenticated | NotProvisionedHasPermission]

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
            raise RestValidationError(detail="Unknown peer: {}".format(baseurl))

        user_info = facility_info["user"]
        roles = user_info["roles"]
        admin_roles = (user_kinds.ADMIN, user_kinds.SUPERUSER)
        if not any(role in roles for role in admin_roles):
            return Response([user_info])
        return Response(facility_info["users"])
