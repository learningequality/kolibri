import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import MinLengthValidator
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ParseError
from rest_framework.validators import UniqueTogetherValidator

from .constants import facility_presets
from .errors import IncompatibleDeviceSettingError
from .errors import InvalidCollectionHierarchy
from .errors import InvalidMembershipError
from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from .models import validate_username_allowed_chars
from .models import validate_username_max_length
from kolibri.core import error_constants
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED


logger = logging.getLogger(__name__)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "kind", "collection", "user")


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
        )
        read_only_fields = ("is_superuser",)

    def save(self, **kwargs):
        instance = super(FacilityUserSerializer, self).save(**kwargs)
        validated_data = dict(list(self.validated_data.items()) + list(kwargs.items()))
        password = validated_data.get("password")
        if password and password != NOT_SPECIFIED:
            instance.set_password(password)
            instance.save()
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


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ("id", "collection", "user")

    def save(self, **kwargs):
        try:
            return super(MembershipSerializer, self).save(**kwargs)
        except InvalidMembershipError as e:
            raise serializers.ValidationError(str(e))


class FacilityDatasetSerializer(serializers.ModelSerializer):

    extra_fields = serializers.JSONField(required=False)

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
            "extra_fields",
            "description",
            "location",
            "registered",
            "preset",
        )

    def save(self, **kwargs):
        try:
            return super(FacilityDatasetSerializer, self).save(**kwargs)
        except IncompatibleDeviceSettingError as e:
            raise serializers.ValidationError(str(e))


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
                logger.error("Error occured while creating facility: %s", str(e))
                raise ParseError("Error occured while creating facility")
        return facility


class PublicFacilitySerializer(serializers.ModelSerializer):
    learner_can_login_with_no_password = serializers.SerializerMethodField()
    learner_can_sign_up = serializers.SerializerMethodField()
    on_my_own_setup = serializers.SerializerMethodField()

    def get_learner_can_login_with_no_password(self, instance):
        return instance.dataset.learner_can_login_with_no_password

    def get_learner_can_sign_up(self, instance):
        return instance.dataset.learner_can_sign_up

    def get_on_my_own_setup(self, instance):
        if instance.dataset.extra_fields is not None:
            return instance.dataset.extra_fields.get("on_my_own_setup", False)
        return False

    class Meta:
        model = Facility
        fields = (
            "id",
            "dataset",
            "name",
            "learner_can_login_with_no_password",
            "learner_can_sign_up",
            "on_my_own_setup",
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
            return super(ClassroomSerializer, self).save(**kwargs)
        except InvalidCollectionHierarchy as e:
            raise serializers.ValidationError(str(e))


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
            return super(LearnerGroupSerializer, self).save(**kwargs)
        except InvalidCollectionHierarchy as e:
            raise serializers.ValidationError(str(e))


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
