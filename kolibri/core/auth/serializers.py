from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

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
from kolibri.core import error_constants


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "kind", "collection", "user")


class FacilityUserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

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
        )
        read_only_fields = ("is_superuser",)

    def validate(self, attrs):
        username = attrs.get("username")
        # first condition is for creating object, second is for updating
        facility = attrs.get("facility") or getattr(self.instance, "facility")
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


class PublicFacilitySerializer(serializers.ModelSerializer):
    learner_can_login_with_no_password = serializers.SerializerMethodField()

    def get_learner_can_login_with_no_password(self, instance):
        return instance.dataset.learner_can_login_with_no_password

    class Meta:
        model = Facility
        fields = ("id", "dataset", "name", "learner_can_login_with_no_password")


class PublicFacilityUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityUser
        fields = (
            "id",
            "username",
            "full_name",
            "facility",
            "roles",
            "is_superuser",
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
