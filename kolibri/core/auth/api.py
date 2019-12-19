from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import time
from functools import partial
from itertools import groupby

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.models import AnonymousUser
from django.db import connection
from django.db import transaction
from django.db.models import CharField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models.query import F
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from django.views.decorators.csrf import ensure_csrf_cookie
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from rest_framework import filters
from rest_framework import permissions
from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response

from .constants import collection_kinds
from .constants import role_kinds
from .filters import HierarchyRelationsFilter
from .models import Classroom
from .models import Collection
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import AdHocGroup
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .serializers import ClassroomSerializer
from .serializers import FacilityDatasetSerializer
from .serializers import FacilitySerializer
from .serializers import FacilityUserSerializer
from .serializers import AdHocGroupSerializer
from .serializers import LearnerGroupSerializer
from .serializers import MembershipSerializer
from .serializers import PublicFacilitySerializer
from .serializers import RoleSerializer
from kolibri.core import error_constants
from kolibri.core.api import ValuesViewset
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin
from kolibri.core.query import ArrayAgg
from kolibri.core.query import GroupConcat
from kolibri.core.query import process_uuid_aggregate
from kolibri.core.query import SQCount


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
        else:
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
        elif request.method in ["PUT", "PATCH"]:
            return request.user.can_update(obj)
        elif request.method == "DELETE":
            return request.user.can_delete(obj)
        else:
            return False


class FacilityDatasetViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    serializer_class = FacilityDatasetSerializer

    def get_queryset(self):
        queryset = FacilityDataset.objects.filter(
            collection__kind=collection_kinds.FACILITY
        )
        facility_id = self.request.query_params.get("facility_id", None)
        if facility_id is not None:
            queryset = queryset.filter(collection__id=facility_id)
        return queryset


class FacilityUserFilter(FilterSet):

    member_of = ModelChoiceFilter(
        method="filter_member_of", queryset=Collection.objects.all()
    )

    def filter_member_of(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F("id"), ancestor_collection=value
        )

    class Meta:
        model = FacilityUser
        fields = ["member_of"]


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

    def consolidate(self, items):
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


class FacilityUsernameViewSet(ValuesViewset):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filter_fields = ("facility",)
    search_fields = ("^username",)

    read_only = True

    values = ("username",)

    def get_queryset(self):
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


class FacilityViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

    def get_queryset(self, prefetch=True):
        queryset = Facility.objects.all()
        if prefetch:
            # This is a default field on the serializer, so do a select_related
            # to prevent n queries when n facilities are queried
            return queryset.select_related("dataset")
        return queryset


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

        # filter queryset by admin role and coach role
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            source_user=requesting_user,
            role_kind=role_kinds.ADMIN,
            descendant_collection=F("id"),
        ) | HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            source_user=requesting_user, role_kind=value, descendant_collection=F("id")
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

    def consolidate(self, items):
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

    field_map = {"user_ids": partial(process_uuid_aggregate, key="user_ids")}

    def annotate_queryset(self, queryset):
        if connection.vendor == "postgresql" and ArrayAgg is not None:
            return queryset.annotate(user_ids=ArrayAgg("membership__user__id"))
        return queryset.values("id").annotate(
            user_ids=GroupConcat("membership__user__id", output_field=CharField())
        )


class AdHocGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = AdHocGroup.objects.all()
    serializer_class = AdHocGroupSerializer

    filter_fields = ("parent",)

    values = ("id", "name", "parent", "user_ids")

    field_map = {"user_ids": partial(process_uuid_aggregate, key="user_ids")}

    def annotate_queryset(self, queryset):
        if connection.vendor == "postgresql" and ArrayAgg is not None:
            return queryset.annotate(user_ids=ArrayAgg("membership__user__id"))
        return queryset.values("id").annotate(
            user_ids=GroupConcat("membership__user__id", output_field=CharField())
        )

    def partial_update(self, request, pk):
        individual_learners_group = AdHocGroup.objects.filter(pk=pk)[:1].get()
        current_learners = individual_learners_group.get_learners()
        updated_learners = FacilityUser.objects.filter(pk__in=request.data["user_ids"])

        for c_learner in current_learners:
            if c_learner not in updated_learners:
                individual_learners_group.remove_learner(c_learner)

        for u_learner in updated_learners:
            if u_learner not in current_learners:
                individual_learners_group.add_learner(u_learner)
        return Response(self.serializer_class(individual_learners_group).data)


class SignUpViewSet(viewsets.ViewSet):

    serializer_class = FacilityUserSerializer

    def extract_request_data(self, request):
        return {
            "username": request.data.get("username", ""),
            "full_name": request.data.get("full_name", ""),
            "password": request.data.get("password", ""),
            "facility": request.data.get(
                "facility", Facility.get_default_facility().id
            ),
            "gender": request.data.get("gender", ""),
            "birth_year": request.data.get("birth_year", ""),
        }

    def create(self, request):

        data = self.extract_request_data(request)

        # we validate the user's input, and if valid, login as user
        serialized_user = self.serializer_class(data=data)
        if serialized_user.is_valid(raise_exception=True):
            serialized_user.save()
            serialized_user.instance.set_password(data["password"])
            serialized_user.instance.save()
            authenticated_user = authenticate(
                username=data["username"],
                password=data["password"],
                facility=data["facility"],
            )
            login(request, authenticated_user)
            return Response(serialized_user.data, status=status.HTTP_201_CREATED)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionViewSet(viewsets.ViewSet):
    def create(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        facility_id = request.data.get("facility", None)
        user = authenticate(username=username, password=password, facility=facility_id)
        if user is not None and user.is_active:
            # Correct password, and the user is marked "active"
            login(request, user)
            # Success!
            # Is this the first time this user has logged in?
            # If so, they will not have any UserSessionLogs until we call get_session.
            request.session["first_login"] = not UserSessionLog.objects.filter(
                user=user
            ).exists()
            return Response(self.get_session(request))
        elif (
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
        else:
            # Respond with error
            return Response(
                [{"id": error_constants.INVALID_CREDENTIALS, "metadata": {}}],
                status=status.HTTP_401_UNAUTHORIZED,
            )

    def destroy(self, request, pk=None):
        logout(request)
        return Response([])

    def retrieve(self, request, pk=None):
        return Response(self.get_session(request))

    def get_session(self, request):
        user = request.user
        session_key = "current"
        server_time = now()
        session = user.session_data
        session.update({"id": session_key, "server_time": server_time})
        if isinstance(user, AnonymousUser):
            return session
        # Set last activity on session to the current time to prevent session timeout
        # Only do this for logged in users, as anonymous users cannot get logged out!
        request.session["last_session_request"] = int(time.time())
        # Default to active, only assume not active when explicitly set.
        active = True if request.GET.get("active", "true") == "true" else False

        # Can only record user session log data for FacilityUsers.
        if active and isinstance(user, FacilityUser):
            UserSessionLog.update_log(user)

        return session
