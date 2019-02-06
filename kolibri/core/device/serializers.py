from django.db import transaction
from django.utils.translation import check_for_language
from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers

from .models import DevicePermissions
from .models import DeviceSettings
from kolibri.core.auth.constants.facility_presets import choices
from kolibri.core.auth.constants.facility_presets import mappings
from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.serializers import FacilitySerializer
from kolibri.core.auth.serializers import FacilityUserSerializer


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

    def validate(self, attrs):
        return attrs


class DeviceProvisionSerializer(serializers.Serializer):
    facility = FacilitySerializer()
    preset = serializers.ChoiceField(choices=choices)
    superuser = NoFacilityFacilityUserSerializer()
    language_id = serializers.CharField(max_length=15)
    settings = serializers.JSONField()

    class Meta:
        fields = ('facility', 'dataset', 'superuser', 'language_id', 'settings',)

    def validate_language_id(self, language_id):
        """
        Check that the language_id is supported by Kolibri
        """
        if not check_for_language(language_id):
            raise serializers.ValidationError(_("Language is not supported by Kolibri"))
        return language_id

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
            # overwrite the settings in dataset_data with validated_data.settings
            custom_settings = validated_data.pop('settings')
            for key, value in custom_settings.items():
                setattr(facility.dataset, key, value)
            facility.dataset.save()
            superuser_data = validated_data.pop('superuser')
            superuser_data['facility'] = facility
            superuser = FacilityUserSerializer(data=superuser_data).create(superuser_data)
            superuser.set_password(superuser_data["password"])
            superuser.save()
            facility.add_role(superuser, ADMIN)
            DevicePermissions.objects.create(user=superuser, is_superuser=True)
            language_id = validated_data.pop('language_id')
            device_settings, created = DeviceSettings.objects.get_or_create()
            device_settings.is_provisioned = True
            device_settings.language_id = language_id
            device_settings.default_facility = facility
            device_settings.save()
            return {
                "facility": facility,
                "preset": preset,
                "superuser": superuser,
                "language_id": language_id,
                "settings": custom_settings,
            }
