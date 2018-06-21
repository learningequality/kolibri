from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .constants.collection_kinds import LEARNERGROUP
from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role


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

    def create(self, validated_data):
        if FacilityUser.objects.filter(username__iexact=validated_data['username']).exists():
            raise serializers.ValidationError(_('An account with that username already exists'))
        return super(FacilityUserSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('username') and FacilityUser.objects.exclude(id__exact=instance.id).filter(username__iexact=validated_data['username']).exists():
            raise serializers.ValidationError(_('An account with that username already exists'))
        return super(FacilityUserSerializer, self).update(instance, validated_data)


class FacilityUserSignupSerializer(FacilityUserSerializer):

    def validate_username(self, value):
        if FacilityUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(_('An account with that username already exists'))
        return value


class FacilityUsernameSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityUser
        fields = ('username', )


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Membership
        fields = ('id', 'collection', 'user')

    def create(self, validated_data):
        user = validated_data["user"]
        collection = validated_data["collection"]
        if collection.kind == LEARNERGROUP and user.memberships.filter(collection__parent=collection.parent).exists():
            # We are trying to create a membership for a user in a group, but they already belong to a group
            # in the same class as this group. We may want to allow this, but the frontend does not currently
            # support this. Error!
            raise serializers.ValidationError('This user is already in a group in this class')
        return super(MembershipSerializer, self).create(validated_data)


class FacilityDatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityDataset
        fields = ('id', 'learner_can_edit_username', 'learner_can_edit_name', 'learner_can_edit_password',
                  'learner_can_sign_up', 'learner_can_delete_account', 'learner_can_login_with_no_password',
                  'show_download_button_in_learn', 'description', 'location')


class FacilitySerializer(serializers.ModelSerializer):
    dataset = FacilityDatasetSerializer(read_only=True)

    class Meta:
        model = Facility
        extra_kwargs = {'id': {'read_only': True}, 'dataset': {'read_only': True}}
        fields = ('id', 'name', 'dataset')


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
                queryset=Classroom.objects.all(),
                fields=('parent', 'name')
            )
        ]
