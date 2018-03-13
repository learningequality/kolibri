from __future__ import absolute_import, print_function, unicode_literals

from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .constants import role_kinds
from .models import Classroom, Facility, FacilityDataset, FacilityUser, LearnerGroup, Membership, Role


class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = Role
        fields = ('id', 'kind', 'collection', 'user')


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


class FacilityDatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityDataset
        fields = ('id', 'learner_can_edit_username', 'learner_can_edit_name', 'learner_can_edit_password',
                  'learner_can_sign_up', 'learner_can_delete_account', 'learner_can_login_with_no_password',
                  'description', 'location')


class FacilitySerializer(serializers.ModelSerializer):

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
    coach_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()

    def get_learner_count(self, target_node):
        return target_node.get_members().count()

    def get_coach_count(self, target_node):
        return Role.objects.filter(collection=target_node, kind=role_kinds.COACH).count()

    def get_admin_count(self, target_node):
        return Role.objects.filter(collection=target_node, kind=role_kinds.ADMIN).count()

    class Meta:
        model = Classroom
        fields = ('id', 'name', 'parent', 'learner_count', 'coach_count', 'admin_count')

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
