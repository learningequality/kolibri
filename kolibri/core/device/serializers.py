from django.db import transaction
from django.utils.translation import check_for_language
from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers

from kolibri.core.auth.constants.facility_presets import choices
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.serializers import FacilitySerializer
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.utils import provision_device


class DevicePermissionsSerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(queryset=FacilityUser.objects.all())

    class Meta:
        model = DevicePermissions
        fields = ("user", "is_superuser", "can_manage_content")


class NoFacilityFacilityUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityUser
        fields = ("username", "full_name", "password")


class DeviceSerializerMixin(object):
    def validate_language_id(self, language_id):
        """
        Check that the language_id is supported by Kolibri
        """
        if language_id is not None and not check_for_language(language_id):
            raise serializers.ValidationError(_("Language is not supported by Kolibri"))
        return language_id


class DeviceProvisionSerializer(DeviceSerializerMixin, serializers.Serializer):
    facility = FacilitySerializer()
    preset = serializers.ChoiceField(choices=choices)
    superuser = NoFacilityFacilityUserSerializer()
    language_id = serializers.CharField(max_length=15)
    device_name = serializers.CharField(max_length=50, allow_null=True)
    settings = serializers.JSONField()
    allow_guest_access = serializers.BooleanField(allow_null=True)

    class Meta:
        fields = (
            "facility",
            "superuser",
            "language_id",
            "settings",
            "device_name",
            "allow_guest_access",
        )

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
            facility = Facility.objects.create(**validated_data.pop("facility"))
            preset = validated_data.pop("preset")
            facility.dataset.preset = preset
            facility.dataset.reset_to_default_settings(preset)
            # overwrite the settings in dataset_data with validated_data.settings
            custom_settings = validated_data.pop("settings")
            for key, value in custom_settings.items():
                if value is not None:
                    setattr(facility.dataset, key, value)
            facility.dataset.save()

            # Create superuser
            superuser = FacilityUser.objects.create_superuser(
                validated_data["superuser"]["username"],
                validated_data["superuser"]["password"],
                facility=facility,
                full_name=validated_data["superuser"].get("full_name"),
            )

            # Create device settings
            language_id = validated_data.pop("language_id")
            allow_guest_access = validated_data.pop("allow_guest_access")
            if allow_guest_access is None:
                allow_guest_access = preset != "formal"
            provision_device(
                device_name=validated_data["device_name"],
                language_id=language_id,
                default_facility=facility,
                allow_guest_access=allow_guest_access,
            )
            return {
                "facility": facility,
                "preset": preset,
                "superuser": superuser,
                "language_id": language_id,
                "settings": custom_settings,
                "allow_guest_access": allow_guest_access,
            }


class DeviceSettingsSerializer(DeviceSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DeviceSettings
        fields = (
            "language_id",
            "landing_page",
            "allow_guest_access",
            "allow_peer_unlisted_channel_import",
            "allow_learner_unassigned_resource_access",
            "allow_other_browsers_to_connect",
        )

    def create(self, validated_data):
        raise serializers.ValidationError("Device settings can only be updated")
