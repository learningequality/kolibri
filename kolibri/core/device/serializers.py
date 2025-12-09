from django.utils.translation import check_for_language
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.tasks import automatic_resource_import
from kolibri.core.content.tasks import automatic_synchronize_content_requests_and_import
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.utils.filesystem import check_is_directory
from kolibri.utils.filesystem import get_path_permission


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


class PathListField(serializers.ListField):
    def to_representation(self, data):
        return [
            self.child.to_representation(item)
            for item in data
            if check_is_directory(item)
        ]


class DeviceSettingsSerializer(DeviceSerializerMixin, serializers.ModelSerializer):

    extra_settings = serializers.JSONField(required=False)
    primary_storage_location = serializers.CharField(required=False)
    secondary_storage_locations = PathListField(
        child=serializers.CharField(required=False), required=False
    )

    class Meta:
        model = DeviceSettings
        fields = (
            "language_id",
            "landing_page",
            "allow_guest_access",
            "allow_peer_unlisted_channel_import",
            "allow_learner_unassigned_resource_access",
            "allow_other_browsers_to_connect",
            "extra_settings",
            "primary_storage_location",
            "secondary_storage_locations",
        )

    def create(self, validated_data):
        raise serializers.ValidationError("Device settings can only be updated")

    def update(self, instance, validated_data):
        if "extra_settings" in validated_data:
            updated_extra_settings = validated_data.get("extra_settings")
            initial_extra_settings = getattr(instance, "extra_settings", "{}")

            if updated_extra_settings != initial_extra_settings:
                automatic_download_enabled = updated_extra_settings.get(
                    "enable_automatic_download"
                )
                if automatic_download_enabled != initial_extra_settings.get(
                    "enable_automatic_download"
                ):
                    if automatic_download_enabled:
                        automatic_synchronize_content_requests_and_import.enqueue_if_not()
                    else:
                        # If the trigger is switched from on to off we need to cancel any ongoing syncing of resources
                        automatic_synchronize_content_requests_and_import.cancel_all()
                        automatic_resource_import.cancel_all()

        instance = super().update(instance, validated_data)
        return instance

    def validate(self, data):
        data = super().validate(data)
        if "primary_storage_location" in data:
            if not check_is_directory(data["primary_storage_location"]):
                raise serializers.ValidationError(
                    {
                        "primary_storage_location": "Primary storage location must be a directory"
                    }
                )
            if not get_path_permission(data["primary_storage_location"]):
                raise serializers.ValidationError(
                    {
                        "primary_storage_location": "Primary storage location must be writable"
                    }
                )

        if "secondary_storage_locations" in data:
            for path in data["secondary_storage_locations"]:
                if path == "" or path is None:
                    continue
                if not check_is_directory(path):
                    raise serializers.ValidationError(
                        {
                            "secondary_storage_locations": "Secondary storage location must be a directory"
                        }
                    )
        return data
