import logging

from django.db import transaction
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework import serializers
from rest_framework import viewsets

from kolibri.core import error_constants
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin

from ..constants import collection_kinds
from ..constants import role_kinds
from ..errors import InvalidRoleKind
from ..models import FacilityUser
from ..models import Role
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter
from .membership import _get_batch_size
from .membership import _prepare_for_bulk_create

logger = logging.getLogger(__name__)


class RoleListSerializer(serializers.ListSerializer):
    def validate(self, attrs):
        for item in attrs:
            instance = Role(**item)
            try:
                instance.validate_role()
            except InvalidRoleKind as e:
                raise serializers.ValidationError(
                    "Invalid role kind",
                    code=error_constants.INVALID,
                ) from e
        return attrs

    def create(self, validated_data):
        objects_to_create = []
        for model_data in validated_data:
            instance = Role(**model_data)
            _prepare_for_bulk_create(instance)
            objects_to_create.append(instance)

        batch_size = _get_batch_size(Role)

        with transaction.atomic():
            # Filter out already-existing roles by their deterministic morango UUID
            existing_ids = set(
                Role.objects.filter(
                    id__in=[obj.id for obj in objects_to_create]
                ).values_list("id", flat=True)
            )
            new_objects = [
                obj for obj in objects_to_create if obj.id not in existing_ids
            ]

            if new_objects:
                Role.objects.bulk_create(
                    new_objects,
                    batch_size=batch_size,
                    ignore_conflicts=True,
                )

            # Handle ASSIGNABLE_COACH side effect for classroom coach roles
            classroom_roles = [
                obj
                for obj in new_objects
                if obj.collection.kind == collection_kinds.CLASSROOM
            ]
            if classroom_roles:
                user_ids = {obj.user_id for obj in classroom_roles}
                facility_ids = {obj.collection.parent_id for obj in classroom_roles}
                users_with_facility_role = set(
                    Role.objects.filter(
                        collection_id__in=facility_ids,
                        user_id__in=user_ids,
                    ).values_list("user_id", "collection_id")
                )
                assignable_roles = []
                for obj in classroom_roles:
                    parent_id = obj.collection.parent_id
                    pair = (obj.user_id, parent_id)
                    if pair not in users_with_facility_role:
                        instance = Role(
                            user=obj.user,
                            collection_id=parent_id,
                            kind=role_kinds.ASSIGNABLE_COACH,
                        )
                        _prepare_for_bulk_create(instance)
                        assignable_roles.append(instance)
                        users_with_facility_role.add(pair)
                if assignable_roles:
                    Role.objects.bulk_create(
                        assignable_roles,
                        batch_size=batch_size,
                        ignore_conflicts=True,
                    )

        return new_objects


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "kind", "collection", "user")
        list_serializer_class = RoleListSerializer
        validators = []


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

    def perform_create(self, serializer):
        with transaction.atomic():
            super().perform_create(serializer)
            instances = serializer.instance
            if not isinstance(instances, list):
                instances = [instances]
            user_ids = [role.user_id for role in instances]
            FacilityUser.objects.filter(
                id__in=user_ids, picture_password__isnull=False
            ).update(picture_password=None, _morango_dirty_bit=True)
