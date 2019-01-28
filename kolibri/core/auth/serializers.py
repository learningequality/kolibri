from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role
from kolibri.core import error_constants


class RoleSerializer(serializers.ModelSerializer):
    collection_parent = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ('id', 'kind', 'collection', 'user', 'collection_parent',)

    def get_collection_parent(self, instance):
        if instance.collection.parent is not None:
            return instance.collection.parent.id
        else:
            return None


class FacilityUserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = FacilityUser
        extra_kwargs = {'password': {'write_only': True}}
        fields = ('id', 'username', 'full_name', 'password', 'facility', 'roles', 'is_superuser')

    def validate(self, attrs):
        username = attrs.get('username')
        # first condition is for creating object, second is for updating
        facility = attrs.get('facility') or getattr(self.instance, 'facility')
        # if obj doesn't exist, return data
        try:
            obj = FacilityUser.objects.get(username__iexact=username, facility=facility)
        except FacilityUser.DoesNotExist:
            return attrs
        # if we are updating object, and this `instance` is the same object, return data
        if self.instance and obj.id == self.instance.id:
            return attrs
        else:
            raise serializers.ValidationError('An account with that username already exists.', code=error_constants.USERNAME_ALREADY_EXISTS)


class FacilityUsernameSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityUser
        fields = ('username', )


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Membership
        fields = ('id', 'collection', 'user')


class FacilityDatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityDataset
        fields = ('id', 'learner_can_edit_username', 'learner_can_edit_name', 'learner_can_edit_password',
                  'learner_can_sign_up', 'learner_can_delete_account', 'learner_can_login_with_no_password',
                  'show_download_button_in_learn', 'description', 'location', 'allow_guest_access')


class FacilitySerializer(serializers.ModelSerializer):
    dataset = FacilityDatasetSerializer(read_only=True)
    default = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        extra_kwargs = {'id': {'read_only': True}, 'dataset': {'read_only': True}}
        fields = ('id', 'name', 'dataset', 'default')

    def get_default(self, instance):
        return instance == Facility.get_default_facility()


class PublicFacilitySerializer(serializers.ModelSerializer):

    class Meta:
        model = Facility
        fields = ('dataset', 'name')


class ClassroomSerializer(serializers.ModelSerializer):
    learner_count = serializers.SerializerMethodField()
    coaches = serializers.SerializerMethodField()

    def get_learner_count(self, instance):
        return instance.get_members().count()

    def get_coaches(self, instance):
        return FacilityUserSerializer(instance.get_coaches(), many=True).data

    class Meta:
        model = Classroom
        fields = (
            'id',
            'name',
            'parent',
            'learner_count',
            'coaches',
        )

        validators = [
            UniqueTogetherValidator(
                queryset=Classroom.objects.all(),
                fields=('parent', 'name')
            )
        ]


class LearnerGroupSerializer(serializers.ModelSerializer):

    user_ids = serializers.SerializerMethodField()

    def get_user_ids(self, group):
        return [str(user_id['id']) for user_id in group.get_members().values('id')]

    class Meta:
        model = LearnerGroup
        fields = ('id', 'name', 'parent', 'user_ids')

        validators = [
            UniqueTogetherValidator(
                queryset=LearnerGroup.objects.all(),
                fields=('parent', 'name')
            )
        ]
