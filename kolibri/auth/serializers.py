from __future__ import absolute_import, print_function, unicode_literals

from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers

from .models import Classroom, DeviceOwner, Facility, FacilityDataset, FacilityUser, LearnerGroup, Membership, Role

class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = Role
        exclude = ("dataset",)

class BaseKolibriUserSerializer(serializers.ModelSerializer):

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            serializers.raise_errors_on_nested_writes('update', self, validated_data)
            instance.set_password(validated_data['password'])
            instance.save()
            return instance
        else:
            return super(BaseKolibriUserSerializer, self).update(instance, validated_data)

    def validate_username(self, value):
        if FacilityUser.objects.filter(username__iexact=value).exists() | DeviceOwner.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(_('An account with that username already exists'))
        return value

    def create(self, validated_data):
        user = self.Meta.model(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user


class FacilityUserSerializer(BaseKolibriUserSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = FacilityUser
        extra_kwargs = {'password': {'write_only': True}}
        fields = ('id', 'username', 'full_name', 'password', 'facility', 'roles')


class DeviceOwnerSerializer(BaseKolibriUserSerializer):

    class Meta:
        model = DeviceOwner
        exclude = ("last_login",)
        extra_kwargs = {'password': {'write_only': True}}


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Membership
        exclude = ("dataset",)


class FacilityDatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityDataset
        fields = ('id', 'learner_can_edit_username', 'learner_can_edit_name', 'learner_can_edit_password',
                  'learner_can_sign_up', 'learner_can_delete_account', 'description', 'location')


class FacilitySerializer(serializers.ModelSerializer):

    class Meta:
        model = Facility
        exclude = ("dataset", "kind", "parent")


class ClassroomSerializer(serializers.ModelSerializer):

    class Meta:
        model = Classroom
        fields = ('id', 'name', 'parent')


class LearnerGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = LearnerGroup
        fields = ('id', 'name', 'parent')
