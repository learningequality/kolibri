import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import MinLengthValidator
from django.db import connections
from django.db import transaction
from morango.sync.backends.utils import calculate_max_sqlite_variables
from rest_framework import serializers
from rest_framework.exceptions import ParseError
from rest_framework.validators import UniqueTogetherValidator

from .constants import collection_kinds
from .constants import facility_presets
from .constants import role_kinds
from .errors import IncompatibleDeviceSettingError
from .errors import InvalidCollectionHierarchy
from .errors import InvalidMembershipError
from .errors import InvalidRoleKind
from .errors import NoAvailableSequences
from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .models import validate_username_allowed_chars
from .models import validate_username_max_length
from .utils.picture_passwords import are_picture_passwords_exhausted
from .utils.picture_passwords import assign_picture_password
from .utils.qr_tokens import assign_qr_login_token
from kolibri.core import error_constants
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED

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


class FacilityUserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        default=Facility.get_default_facility,
        required=False,
        error_messages={"does_not_exist": "Facility does not exist."},
    )
    extra_demographics = serializers.JSONField(required=False)

    class Meta:
        model = FacilityUser
        extra_kwargs = {"password": {"write_only": True}}
        fields = (
            "id",
            "username",
            "full_name",
            "password",
            "facility",
            "roles",
            "is_superuser",
            "id_number",
            "gender",
            "birth_year",
            "extra_demographics",
            "picture_password",
            "qr_login_token",
            "profile_image",
        )
        read_only_fields = ("is_superuser", "picture_password", "qr_login_token")

    def save(self, **kwargs):
        instance = super().save(**kwargs)
        validated_data = dict(list(self.validated_data.items()) + list(kwargs.items()))
        password = validated_data.get("password")
        if password and password != NOT_SPECIFIED:
            instance.set_password(password)
            instance.save()
        return instance

    def create(self, validated_data):
        with transaction.atomic():
            instance = super().create(validated_data)
            facility = instance.facility
            if (
                facility.dataset.picture_password_settings is not None
                and not are_picture_passwords_exhausted(instance.dataset_id)
            ):
                try:
                    assign_picture_password(instance, instance.facility)
                except NoAvailableSequences:
                    pass
            if facility.dataset.enable_qr_login:
                assign_qr_login_token(instance)
        return instance

    def _validate_extra_demographics(self, attrs, facility):
        # Validate the extra demographics here, as we need access to the facility dataset
        extra_demographics = attrs.get("extra_demographics")
        if extra_demographics:
            try:
                facility.dataset.validate_demographic_data(extra_demographics)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"extra_demographics": e.message})

    def validate(self, attrs):
        username = attrs.get("username", None)
        if username is not None:
            # in case a patch request does not provide username attribute
            try:
                validate_username_allowed_chars(username)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"username": e.message})

            try:
                validate_username_max_length(username)
            except DjangoValidationError as e:
                raise serializers.ValidationError(
                    {"username": e.message}, code=error_constants.MAX_LENGTH
                )

        # first condition is for creating object, second is for updating
        facility = attrs.get("facility") or getattr(self.instance, "facility")
        if (
            "password" in attrs
            and attrs["password"] == NOT_SPECIFIED
            and not facility.dataset.learner_can_login_with_no_password
        ):
            raise serializers.ValidationError(
                "No password specified and it is required",
                code=error_constants.PASSWORD_NOT_SPECIFIED,
            )
        self._validate_extra_demographics(attrs, facility)

        # if obj doesn't exist, return data
        try:
            obj = FacilityUser.objects.get(username__iexact=username, facility=facility)
        except FacilityUser.DoesNotExist:
            return attrs
        # if we are updating object, and this `instance` is the same object, return data
        if self.instance and obj.id == self.instance.id:
            return attrs
        else:
            raise serializers.ValidationError(
                "An account with that username already exists.",
                code=error_constants.USERNAME_ALREADY_EXISTS,
            )


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


class FacilityDatasetSerializer(serializers.ModelSerializer):

    extra_fields = serializers.JSONField(required=False)
    picture_password_settings = serializers.JSONField(allow_null=True, required=False)

    class Meta:
        model = FacilityDataset
        fields = (
            "id",
            "learner_can_edit_username",
            "learner_can_edit_name",
            "learner_can_edit_password",
            "learner_can_sign_up",
            "learner_can_delete_account",
            "learner_can_login_with_no_password",
            "show_download_button_in_learn",
            "enable_mark_attendance",
            "enable_qr_login",
            "extra_fields",
            "picture_password_settings",
            "description",
            "location",
            "registered",
            "preset",
        )

    def validate(self, attrs):
        settings = attrs.get("picture_password_settings")
        if settings is not None:
            if not isinstance(settings, dict):
                raise serializers.ValidationError(
                    {"picture_password_settings": "Must be an object or null"}
                )
            if settings.get("icon_style") not in ("standard", "colorful"):
                raise serializers.ValidationError(
                    {
                        "picture_password_settings": "icon_style must be 'standard' or 'colorful'"
                    }
                )
            if not isinstance(settings.get("show_icon_text"), bool):
                raise serializers.ValidationError(
                    {"picture_password_settings": "show_icon_text must be a boolean"}
                )
        return attrs

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except IncompatibleDeviceSettingError as e:
            raise serializers.ValidationError(
                "Incompatible device setting",
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
    enable_qr_login = serializers.SerializerMethodField()

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

    def get_enable_qr_login(self, instance):
        return instance.dataset.enable_qr_login

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
            "enable_qr_login",
        )


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ("id", "name", "parent")
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
