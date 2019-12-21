from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import TextField
from django.db.models.functions import Cast
from morango.models import TransferSession
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import AdHocGroup
from .models import Membership
from .models import Role
from kolibri.core import error_constants
from kolibri.core.device.utils import allow_guest_access


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


class FacilityDatasetSerializer(serializers.ModelSerializer):
    allow_guest_access = serializers.SerializerMethodField()

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
            "allow_guest_access",
            "registered",
        )

    def get_allow_guest_access(self, instance):
        return allow_guest_access()


class FacilitySerializer(serializers.ModelSerializer):
    dataset = FacilityDatasetSerializer(read_only=True)
    default = serializers.SerializerMethodField()
    last_synced = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        extra_kwargs = {"id": {"read_only": True}, "dataset": {"read_only": True}}
        fields = ("id", "name", "dataset", "default", "last_synced")

    def get_default(self, instance):
        return instance == Facility.get_default_facility()

    def get_last_synced(self, instance):

        # when facilities are synced, the dataset_id is used as the filter
        last_synced = (
            TransferSession.objects.filter(filter=OuterRef("casted_dataset_id"))
            .order_by("-last_activity_timestamp")
            .values("last_activity_timestamp")[:1]
        )

        # get last synced date
        last_synced_date = (
            Facility.objects.filter(id=instance.id)
            .annotate(casted_dataset_id=Cast("dataset_id", TextField()))
            .annotate(last_synced=Subquery(last_synced))
            .values_list("last_synced", flat=True)
        )
        return last_synced_date[0]


class PublicFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = ("id", "dataset", "name")


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


class LearnerGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearnerGroup
        fields = ("id", "name", "parent")

        validators = [
            UniqueTogetherValidator(
                queryset=LearnerGroup.objects.all(), fields=("parent", "name")
            )
        ]


class AdHocGroupSerializer(serializers.ModelSerializer):

    user_ids = serializers.SerializerMethodField()

    def get_user_ids(self, group):
        return [str(user_id["id"]) for user_id in group.get_members().values("id")]

    class Meta:
        model = AdHocGroup
        fields = ("id", "name", "parent", "user_ids")
