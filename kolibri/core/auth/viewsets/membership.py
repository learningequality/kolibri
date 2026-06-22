import logging

from django.db import connections
from django.db import transaction
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from morango.sync.backends.utils import calculate_max_sqlite_variables
from rest_framework import serializers
from rest_framework import viewsets

from kolibri.core import error_constants
from kolibri.core.mixins import BulkCreateMixin
from kolibri.core.mixins import BulkDeleteMixin

from ..constants import collection_kinds
from ..errors import InvalidMembershipError
from ..models import Membership
from ..permissions import KolibriAuthPermissions
from ..permissions import KolibriAuthPermissionsFilter

logger = logging.getLogger(__name__)


def _prepare_for_bulk_create(instance):
    """
    Prepare a morango SyncableModel instance for bulk_create by manually
    setting the fields that would normally be set during save().
    """
    instance.pre_save()
    instance.id = instance.calculate_uuid()
    instance._morango_dirty_bit = True


def _get_batch_size(Model):
    """
    Calculate a safe batch_size for bulk_create to avoid SQLite variable limits.
    Cap at 500 to prevent 'too many terms in compound SELECT' errors.
    Same pattern as kolibri.core.auth.utils.migrate._batch_save.
    """
    vendor = connections[Model.objects.db].vendor
    if vendor == "sqlite":
        return min(calculate_max_sqlite_variables() // len(Model._meta.fields), 500)
    return 750


class MembershipListSerializer(serializers.ListSerializer):
    def validate(self, attrs):
        lg_items = []
        for item in attrs:
            collection = item["collection"]
            if collection.kind == collection_kinds.FACILITY:
                raise serializers.ValidationError(
                    "Cannot create membership objects for facilities, "
                    "as should already be a member by facility attribute"
                )
            if collection.kind in (
                collection_kinds.LEARNERGROUP,
                collection_kinds.ADHOCLEARNERSGROUP,
            ):
                lg_items.append(item)

        if lg_items:
            # Batch check parent classroom memberships with a single query
            needed_pairs = {
                (item["collection"].parent_id, item["user"].id) for item in lg_items
            }
            existing_memberships = set(
                Membership.objects.filter(
                    collection_id__in={p[0] for p in needed_pairs},
                    user_id__in={p[1] for p in needed_pairs},
                ).values_list("collection_id", "user_id")
            )
            for item in lg_items:
                pair = (item["collection"].parent_id, item["user"].id)
                if pair not in existing_memberships:
                    raise serializers.ValidationError(
                        "Cannot create membership for a user in a "
                        "LearnerGroup or AdHocGroup when they are not a "
                        "member of the parent Classroom"
                    )
        return attrs

    def create(self, validated_data):
        objects_to_create = []
        for model_data in validated_data:
            instance = Membership(**model_data)
            _prepare_for_bulk_create(instance)
            objects_to_create.append(instance)

        with transaction.atomic():
            # Filter out already-existing memberships by their deterministic morango UUID
            existing_ids = set(
                Membership.objects.filter(
                    id__in=[obj.id for obj in objects_to_create]
                ).values_list("id", flat=True)
            )
            new_objects = [
                obj for obj in objects_to_create if obj.id not in existing_ids
            ]

            if new_objects:
                Membership.objects.bulk_create(
                    new_objects,
                    batch_size=_get_batch_size(Membership),
                    ignore_conflicts=True,
                )

        return new_objects


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ("id", "collection", "user")
        list_serializer_class = MembershipListSerializer
        validators = []

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except InvalidMembershipError as e:
            raise serializers.ValidationError(
                "Invalid membership",
                code=error_constants.INVALID,
            ) from e


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
