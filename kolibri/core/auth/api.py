from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import time
from datetime import datetime
from datetime import timedelta
from itertools import groupby
from uuid import uuid4

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Func
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import TextField
from django.db.models import Value
from django.db.models.functions import Cast
from django.http import Http404
from django.http import HttpResponseForbidden
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from django.views.decorators.csrf import ensure_csrf_cookie
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from morango.api.permissions import BasicMultiArgumentAuthentication
from morango.models import TransferSession
from rest_framework import decorators
from rest_framework import filters
from rest_framework import permissions
from rest_framework import status
from rest_framework import views
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

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
from .serializers import FacilityDatasetSerializer
from .serializers import FacilitySerializer
from .serializers import FacilityUserSerializer
from .serializers import LearnerGroupSerializer
from .serializers import MembershipSerializer
from .serializers import PublicFacilitySerializer
from .serializers import PublicFacilityUserSerializer
from .serializers import RoleSerializer
from kolibri.core import error_constants
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility
from kolibri.core.device.utils import allow_guest_access
from kolibri.core.device.utils import allow_other_browsers_to_connect
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.core.query import annotate_array_aggregate
from kolibri.core.query import SQCount
from kolibri.plugins.app.utils import interface


class KolibriAuthPermissionsFilter(filters.BaseFilterBackend):
    """
    A Django REST Framework filter backend that limits results to those where the
    requesting user has read object level permissions. This filtering is delegated
    to the ``filter_readable`` method on ``KolibriAbstractBaseUser``.
    """

    def filter_queryset(self, request, queryset, view):
        if request.method == "GET" and request.resolver_match.url_name.endswith(
            "-list"
        ):
            # only filter down the queryset in the case of the list view being requested
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


class FacilityDatasetViewSet(ValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
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
        "description",
        "location",
        "registered",
        "preset",
    )

    field_map = {"allow_guest_access": lambda x: allow_guest_access()}

    def get_queryset(self):
        queryset = FacilityDataset.objects.filter(
            collection__kind=collection_kinds.FACILITY
        )
        facility_id = self.request.query_params.get("facility_id", None)
        if facility_id is not None:
            queryset = queryset.filter(collection__id=facility_id)
        return queryset

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


class FacilityUserFilter(FilterSet):

    member_of = ModelChoiceFilter(
        method="filter_member_of", queryset=Collection.objects.all()
    )

    def filter_member_of(self, queryset, name, value):
        return queryset.filter(Q(memberships__collection=value) | Q(facility=value))

    class Meta:
        model = FacilityUser
        fields = ["member_of"]


class PublicFacilityUserViewSet(ReadOnlyValuesViewset):
    queryset = FacilityUser.objects.all()
    serializer_class = PublicFacilityUserSerializer
    authentication_classes = [BasicMultiArgumentAuthentication]
    permission_classes = [IsAuthenticated]
    values = (
        "id",
        "username",
        "full_name",
        "facility",
        "roles__kind",
        "devicepermissions__is_superuser",
    )
    field_map = {
        "is_superuser": lambda x: bool(x.pop("devicepermissions__is_superuser")),
    }

    def get_queryset(self):
        facility_id = self.request.query_params.get("facility_id", None)
        if facility_id is None:
            facility_id = self.request.user.facility_id

        # if user has admin rights for the facility returns the list of users
        queryset = self.queryset.filter(facility_id=facility_id)
        # otherwise, the endpoint returns only the user information
        if not self.request.user.is_superuser or not _user_is_admin_for_own_facility(
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
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = FacilityUser.objects.all()
    serializer_class = FacilityUserSerializer
    filter_class = FacilityUserFilter

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
    )

    field_map = {
        "is_superuser": lambda x: bool(x.pop("devicepermissions__is_superuser"))
    }

    def consolidate(self, items, queryset):
        output = []
        items = sorted(items, key=lambda x: x["id"])
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
        return output

    def set_password_if_needed(self, instance, serializer):
        with transaction.atomic():
            if serializer.validated_data.get("password", ""):
                if serializer.validated_data.get("password", "") != "NOT_SPECIFIED":
                    instance.set_password(serializer.validated_data["password"])
                instance.save()
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self.set_password_if_needed(instance, serializer)
        # if the user is updating their own password, ensure they don't get logged out
        if self.request.user == instance:
            update_session_auth_hash(self.request, instance)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.set_password_if_needed(instance, serializer)


class ExistingUsernameView(views.APIView):
    def get(self, request):
        username = request.GET.get("username")
        facility_id = request.GET.get("facility")

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
            return Response({"username_exists": True}, status=status.HTTP_200_OK)
        except ObjectDoesNotExist:
            return Response({"username_exists": False}, status=status.HTTP_200_OK)


class FacilityUsernameViewSet(ReadOnlyValuesViewset):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filter_fields = ("facility",)
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
    filter_class = MembershipFilter
    filter_fields = ["user", "collection", "user_ids"]


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
    filter_class = RoleFilter
    filter_fields = ["user", "collection", "kind", "user_ids"]


dataset_keys = [
    "dataset__id",
    "dataset__learner_can_edit_username",
    "dataset__learner_can_edit_name",
    "dataset__learner_can_edit_password",
    "dataset__learner_can_sign_up",
    "dataset__learner_can_delete_account",
    "dataset__learner_can_login_with_no_password",
    "dataset__show_download_button_in_learn",
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

    facility_values = ["id", "name", "num_classrooms", "num_users", "last_synced"]

    values = tuple(facility_values + dataset_keys)

    field_map = {"dataset": _map_dataset}

    def annotate_queryset(self, queryset):
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
                last_synced=Subquery(
                    TransferSession.objects.filter(
                        filter=Func(
                            Cast(OuterRef("dataset"), TextField()),
                            Value("-"),
                            Value(""),
                            function="replace",
                            output_field=TextField(),
                        )
                    )
                    .order_by("-last_activity_timestamp")
                    .values("last_activity_timestamp")[:1]
                )
            )
        )


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

        if requesting_user.is_anonymous():
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
    filter_class = ClassroomFilter

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

    filter_fields = ("parent",)

    values = ("id", "name", "parent", "user_ids")

    def annotate_queryset(self, queryset):
        return annotate_array_aggregate(queryset, user_ids="membership__user__id")


class SignUpViewSet(viewsets.ViewSet):

    serializer_class = FacilityUserSerializer

    def extract_request_data(self, request):
        return {
            "username": request.data.get("username", ""),
            "full_name": request.data.get("full_name", ""),
            "password": request.data.get("password", ""),
            "facility": request.data.get("facility"),
            "gender": request.data.get("gender", ""),
            "birth_year": request.data.get("birth_year", ""),
        }

    def create(self, request):

        data = self.extract_request_data(request)
        facility_id = data["facility"]

        if facility_id is None:
            facility = Facility.get_default_facility()
            data["facility"] = facility.id
        else:
            try:
                facility = Facility.objects.select_related("dataset").get(
                    id=facility_id
                )
            except Facility.DoesNotExist:
                raise ValidationError(
                    "Facility does not exist.",
                    code=error_constants.FACILITY_DOES_NOT_EXIST,
                )

        if not facility.dataset.learner_can_sign_up:
            return HttpResponseForbidden("Cannot sign up to this facility")

        # we validate the user's input, and if valid, login as user
        serialized_user = self.serializer_class(data=data)
        if serialized_user.is_valid(raise_exception=True):
            if (
                data["password"] == "NOT_SPECIFIED"
                and not facility.dataset.learner_can_login_with_no_password
            ):
                raise ValidationError(
                    "No password specified and it is required",
                    code=error_constants.PASSWORD_NOT_SPECIFIED,
                )
            serialized_user.save()
            if data["password"] != "NOT_SPECIFIED":
                serialized_user.instance.set_password(data["password"])
                serialized_user.instance.save()
            authenticated_user = authenticate(
                username=data["username"],
                password=data["password"],
                facility=data["facility"],
            )
            login(request, authenticated_user)
            return Response(serialized_user.data, status=status.HTTP_201_CREATED)


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
        except ObjectDoesNotExist:
            raise Http404(error_message)

        if user.password != "NOT_SPECIFIED":
            raise Http404(error_message)

        user.set_password(password)
        user.save()

        return Response()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionViewSet(viewsets.ViewSet):
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

        # Find the FacilityUser we're looking for use later on
        try:
            unauthenticated_user = FacilityUser.objects.get(
                username__iexact=username, facility=facility_id
            )
        except ObjectDoesNotExist:
            unauthenticated_user = None

        user = authenticate(username=username, password=password, facility=facility_id)
        if user is not None and user.is_active:
            # Correct password, and the user is marked "active"
            login(request, user)
            # Success!
            return self.get_session_response(request)
        if (
            unauthenticated_user is not None
            and unauthenticated_user.password == "NOT_SPECIFIED"
        ):
            # Here - we have a Learner whose password is "NOT_SPECIFIED" because they were created
            # while the "Require learners to log in with password" setting was disabled - but now
            # it is enabled again.
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
