from django.db import transaction
from django.utils.translation import check_for_language, ugettext_lazy as _
from kolibri.auth.constants.facility_presets import choices, mappings
from kolibri.auth.models import Facility, FacilityUser
from kolibri.auth.serializers import FacilitySerializer, FacilityUserSerializer
from rest_framework import serializers

from .models import DevicePermissions, DeviceSettings


class DevicePermissionsSerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(queryset=FacilityUser.objects.all())

    class Meta:
        model = DevicePermissions
        fields = (
            'user', 'is_superuser', 'can_manage_content',
        )


class NoFacilityFacilityUserSerializer(FacilityUserSerializer):

    class Meta:
        model = FacilityUser
        fields = ('id', 'username', 'full_name', 'password', )


class DeviceProvisionSerializer(serializers.Serializer):
    facility = FacilitySerializer()
    preset = serializers.ChoiceField(choices=choices)
    superuser = NoFacilityFacilityUserSerializer()
    language_code = serializers.CharField(max_length=15)

    class Meta:
        fields = ('facility', 'dataset', 'superuser', 'language_code')

    def validate_language_code(self, language_code):
        """
        Check that the language_code is supported by Kolibri
        """
        if not check_for_language(language_code):
            raise serializers.ValidationError(_("Language is not supported by Kolibri"))
        return language_code

    def create(self, validated_data):
        """
        Endpoint for initial setup of a device.
        Expects a value for:
        default language - the default language of this Kolibri device
        facility - the required fields for setting up a facility
        facilitydataset - facility configuration options
        superuser - the required fields for a facilityuser who will be set as the super user for this device
        """
        with transaction.atomic():
            facility = Facility.objects.create(**validated_data.pop('facility'))
            preset = validated_data.pop('preset')
            dataset_data = mappings[preset]
            for key, value in dataset_data.items():
                setattr(facility.dataset, key, value)
            facility.dataset.save()
            superuser_data = validated_data.pop('superuser')
            superuser_data['facility'] = facility
            superuser = FacilityUserSerializer(data=superuser_data).create(superuser_data)
            DevicePermissions.objects.create(user=superuser, is_superuser=True)
            language_code = validated_data.pop('language_code')
            device_settings, created = DeviceSettings.objects.get_or_create()
            device_settings.is_provisioned = True
            device_settings.language_code = language_code
            device_settings.save()
            return {
                "facility": facility,
                "preset": preset,
                "superuser": superuser,
                "language_code": language_code
            }
