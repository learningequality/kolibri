from __future__ import absolute_import, print_function, unicode_literals

from rest_framework import serializers

from .models import Classroom, DeviceOwner, Facility, FacilityUser, LearnerGroup, Membership, Role


class FacilityUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    roleID = serializers.SerializerMethodField()

    def get_role(self, obj):
        roles = obj.roles.all()
        if len(roles) > 0:
            return roles[0].kind
        return 'learner'

    def get_roleID(slef, obj):
        roles = obj.roles.all()
        if len(roles) > 0:
            return roles[0].id
        return None

    class Meta:
        model = FacilityUser
        extra_kwargs = {'password': {'write_only': True}}
        fields = ('id', 'username', 'first_name', 'last_name', 'password', 'facility', 'role', 'roleID')

    def create(self, validated_data):
        user = FacilityUser(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user


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


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Membership
        exclude = ("dataset",)


class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = Role
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
