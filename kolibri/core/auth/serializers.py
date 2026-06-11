import logging

from django.core.validators import MinLengthValidator
from django.db import connections
from django.db import transaction
from morango.sync.backends.utils import calculate_max_sqlite_variables
from rest_framework import serializers
from rest_framework.exceptions import ParseError
from rest_framework.validators import UniqueTogetherValidator

from kolibri.core import error_constants

from .constants import collection_kinds
from .constants import facility_presets
from .constants import role_kinds
from .errors import InvalidCollectionHierarchy
from .errors import InvalidMembershipError
from .errors import InvalidRoleKind
from .models import Facility
from .models import FacilityDataset
from .models import LearnerGroup
from .models import Membership
from .models import Role

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
                    pair = (obj.user_id, obj.collection.parent_id)
                    if pair not in users_with_facility_role:
                        instance = Role(
                            user=obj.user,
                            collection_id=obj.collection.parent_id,
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

    def validate(self, attrs):
        return attrs


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

    def validate(self, attrs):
        return attrs

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except InvalidMembershipError as e:
            raise serializers.ValidationError(
                "Invalid membership",
                code=error_constants.INVALID,
            ) from e


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        extra_kwargs = {"id": {"read_only": True}}
        fields = ("id", "name")


class CreateFacilitySerializer(serializers.ModelSerializer):
    preset = serializers.ChoiceField(choices=facility_presets.choices)

    class Meta:
        model = Facility
        fields = ("id", "name", "preset")

    def create(self, validated_data):
        preset = validated_data.get("preset")
        name = validated_data.get("name")
        with transaction.atomic():
            try:
                facility_dataset = FacilityDataset.objects.create(preset=preset)
                facility = Facility.objects.create(name=name, dataset=facility_dataset)
                facility.dataset.reset_to_default_settings(preset)
            except Exception as e:
                logger.exception("Error occurred while creating facility")
                raise ParseError("Error occurred while creating facility") from e
        return facility


class PublicFacilitySerializer(serializers.ModelSerializer):
    learner_can_login_with_no_password = serializers.SerializerMethodField()
    learner_can_sign_up = serializers.SerializerMethodField()
    on_my_own_setup = serializers.SerializerMethodField()
    picture_password_settings = serializers.SerializerMethodField()

    def get_learner_can_login_with_no_password(self, instance):
        return instance.dataset.learner_can_login_with_no_password

    def get_learner_can_sign_up(self, instance):
        return instance.dataset.learner_can_sign_up

    def get_on_my_own_setup(self, instance):
        if instance.dataset.extra_fields is not None:
            return instance.dataset.extra_fields.get("on_my_own_setup", False)
        return False

    def get_picture_password_settings(self, instance):
        return instance.dataset.picture_password_settings

    class Meta:
        model = Facility
        fields = (
            "id",
            "dataset",
            "name",
            "learner_can_login_with_no_password",
            "learner_can_sign_up",
            "on_my_own_setup",
            "picture_password_settings",
        )


class LearnerGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearnerGroup
        fields = ("id", "name", "parent")

        validators = [
            UniqueTogetherValidator(
                queryset=LearnerGroup.objects.all(), fields=("parent", "name")
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


def validate_pin_code(value):
    if not value.isdigit():
        raise serializers.ValidationError("A Pin must be number")


class ExtraFieldsSerializer(serializers.Serializer):
    facility = serializers.JSONField(required=False)
    pin_code = serializers.CharField(
        required=False,
        max_length=4,
        validators=[MinLengthValidator(4), validate_pin_code],
    )
    on_my_own_setup = serializers.BooleanField(required=False)
