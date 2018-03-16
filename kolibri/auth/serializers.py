from __future__ import absolute_import, print_function, unicode_literals
from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .constants import role_kinds
from .models import Classroom
from .models import Facility
from .models import FacilityDataset
from .models import FacilityUser
from .models import LearnerGroup
from .models import Membership
from .models import Role

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
    coach_names = serializers.SerializerMethodField()

    def get_learner_count(self, instance):
        # TODO get_members counts everybody; restrict to only learners
        return instance.get_members().count()

    def get_coach_names(self, instance):
        # TODO this only filters members who have COACH role; not necessarily class coach
        return instance.get_members() \
            .filter(roles__kind=role_kinds.COACH) \
            .values_list('full_name', flat=True)

    class Meta:
        model = Classroom
        fields = (
            'id',
            'name',
            'parent',
            'learner_count',
            'coach_names',
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
