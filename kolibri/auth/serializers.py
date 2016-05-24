from rest_framework import serializers

from .models import (
    Classroom, DeviceOwner, Facility, FacilityUser, LearnerGroup, Membership,
    Role
)


class FacilityUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = FacilityUser
        exclude = ("dataset", "last_login")
        extra_kwargs = {'password': {'write_only': True}}

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
        fields = ('id', 'name', )

    def to_representation(self, instance):
        representation = super(ClassroomSerializer, self).to_representation(instance)
        representation['learnerGroups'] = []
        for lg in instance.get_learner_groups():
            representation['learnerGroups'].append({
                'id': lg.id,
                'name': lg.name,
            })
        return representation


class LearnerGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = LearnerGroup
        exclude = ("dataset", "kind")
