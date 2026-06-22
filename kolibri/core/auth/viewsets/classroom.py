import logging

from django.db.models import OuterRef
from django.db.models import Q
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import ModelChoiceFilter
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from kolibri.core import error_constants
from kolibri.core.api import ValuesViewset
from kolibri.core.query import SQCount

from ..constants import collection_kinds
from ..constants import role_kinds
from ..errors import InvalidCollectionHierarchy
from ..models import Classroom
from ..models import Facility
from ..models import FacilityUser
from ..models import Role
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter

logger = logging.getLogger(__name__)


class CoachRoleSerializer(serializers.Serializer):
    collection = serializers.CharField()
    kind = serializers.CharField()
    id = serializers.CharField()


# Demographic fields (birth_year, gender, id_number) are intentionally absent —
# coaches and learners can see other coaches' data via this endpoint. (#5cb13e50)
class CoachSerializer(serializers.Serializer):
    id = serializers.CharField()
    facility = serializers.CharField()
    is_superuser = serializers.BooleanField()
    full_name = serializers.CharField()
    username = serializers.CharField()
    roles = CoachRoleSerializer(many=True)


class ClassroomSerializer(serializers.ModelSerializer):
    learner_count = serializers.IntegerField(read_only=True)
    coaches = CoachSerializer(many=True, read_only=True)

    class Meta:
        model = Classroom
        fields = ("id", "name", "parent", "learner_count", "coaches")
        read_only_fields = ("id",)

        validators = [
            UniqueTogetherValidator(
                queryset=Classroom.objects.all(), fields=("parent", "name")
            )
        ]

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except InvalidCollectionHierarchy as e:
            raise serializers.ValidationError(
                "Invalid collection hierarchy",
                code=error_constants.INVALID,
            ) from e


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
    queryset = Classroom.objects.order_by("id")
    serializer_class = ClassroomSerializer
    filterset_class = ClassroomFilter

    # coaches is assembled via a separate query in consolidate() — the complex
    # join path (role__user__*) that existed in the explicit values tuple is
    # replaced by targeted lookups, keeping the main query lean.
    deferred_fields = ("coaches",)

    def annotate_queryset(self, queryset):
        return queryset.annotate(
            learner_count=SQCount(
                FacilityUser.objects.filter(memberships__collection=OuterRef("id")),
                field="id",
            )
        )

    def consolidate(self, items, queryset):
        if not items:
            return items

        classroom_ids = [item["id"] for item in items]
        classroom_parents = {item["id"]: item["parent"] for item in items}

        # Fetch classroom role assignments with user display data in one query,
        # excluding soft-deleted users — PR #13652.
        # order_by("user") gives deterministic coach ordering within each classroom.
        classroom_role_rows = list(
            Role.objects.filter(
                collection_id__in=classroom_ids,
            )
            .filter(FacilityUser.get_is_active_q())
            .order_by("user")
            .values(
                "collection",
                "user",
                "user__full_name",
                "user__username",
                "user__devicepermissions__is_superuser",
            )
            .distinct()
        )

        coach_user_ids = {r["user"] for r in classroom_role_rows}

        if not coach_user_ids:
            for item in items:
                item["coaches"] = []
            return items

        # Fetch facility-level roles for active coaches
        facility_roles = {
            obj.pop("user"): obj
            for obj in Role.objects.filter(
                user_id__in=coach_user_ids,
                collection__kind=collection_kinds.FACILITY,
            ).values("user", "kind", "collection", "id")
        }

        classroom_coaches = {cid: [] for cid in classroom_ids}

        for row in classroom_role_rows:
            user_id = row["user"]
            classroom_id = row["collection"]
            parent = classroom_parents[classroom_id]
            roles = (
                [facility_roles[user_id]]
                if user_id in facility_roles
                and facility_roles[user_id]["collection"] == parent
                else []
            )

            classroom_coaches[classroom_id].append(
                {
                    "id": user_id,
                    "facility": parent,
                    "is_superuser": bool(row["user__devicepermissions__is_superuser"]),
                    "full_name": row["user__full_name"],
                    "username": row["user__username"],
                    "roles": roles,
                }
            )

        for item in items:
            item["coaches"] = classroom_coaches[item["id"]]

        return items
