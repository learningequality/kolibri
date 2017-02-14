from __future__ import absolute_import, print_function, unicode_literals

from rest_framework import serializers

from .models import Classroom, DeviceOwner, Facility, FacilityUser, LearnerGroup, Membership, Role

class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = Role
        exclude = ("dataset",)


class FacilityUserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = FacilityUser
        extra_kwargs = {'password': {'write_only': True}}
        fields = ('id', 'username', 'full_name', 'password', 'facility', 'roles')

    def create(self, validated_data):
        user = FacilityUser(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            serializers.raise_errors_on_nested_writes('update', self, validated_data)
            instance.set_password(validated_data['password'])
            instance.save()
            return instance
        else:
            return super(FacilityUserSerializer, self).update(instance, validated_data)

    def validate_username(self, value):
        if FacilityUser.objects.filter(username__iexact=value).exists() | DeviceOwner.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('An account with that username already exists.')
        return value


class DeviceOwnerSerializer(serializers.ModelSerializer):

    class Meta:
        model = DeviceOwner
        exclude = ("last_login",)
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = DeviceOwner(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            serializers.raise_errors_on_nested_writes('update', self, validated_data)
            instance.set_password(validated_data['password'])
            instance.save()
            return instance
        else:
            return super(DeviceOwnerSerializer, self).update(instance, validated_data)

    def validate_username(self, value):
        if FacilityUser.objects.filter(username__iexact=value).exists() | DeviceOwner.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('An account with that username already exists.')
        return value


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Membership
        exclude = ("dataset",)


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
