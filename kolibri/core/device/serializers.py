from django.db import transaction
from django.utils.translation import check_for_language
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import ParseError

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.constants.facility_presets import choices
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.serializers import FacilitySerializer
from kolibri.core.content.tasks import automatic_resource_import
from kolibri.core.content.tasks import automatic_synchronize_content_requests_and_import
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import OSUser
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_single_user_device
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.plugins.app.utils import GET_OS_USER
from kolibri.plugins.app.utils import interface
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


class DeviceProvisionSerializer(DeviceSerializerMixin, serializers.Serializer):
    facility = FacilitySerializer(required=False, allow_null=True)
    facility_id = serializers.CharField(max_length=50, required=False, allow_null=True)
    preset = serializers.ChoiceField(choices=choices, required=False, allow_null=True)
    superuser = NoFacilityFacilityUserSerializer(required=False)
    language_id = serializers.CharField(max_length=15)
    device_name = serializers.CharField(max_length=50, allow_null=True)
    settings = serializers.JSONField()
    allow_guest_access = serializers.BooleanField(allow_null=True)
    is_provisioned = serializers.BooleanField(default=True)
    is_soud = serializers.BooleanField(default=True)

    class Meta:
        fields = (
            "facility",
            "facility_id",
            "preset",
            "superuser",
            "language_id",
            "device_name",
            "settings",
            "allow_guest_access",
            "is_provisioned",
            "is_soud",
        )

    def validate(self, data):
        if (
            GET_OS_USER in interface
            and "request" in self.context
            and valid_app_key_on_request(self.context["request"])
        ):
            data["auth_token"] = self.context["request"].COOKIES.get(
                APP_AUTH_TOKEN_COOKIE_NAME
            )
        elif "superuser" not in data:
            raise serializers.ValidationError("Superuser is required for provisioning")

        has_facility = "facility" in data
        has_facility_id = "facility_id" in data

        if (has_facility and has_facility_id) or (
            not has_facility and not has_facility_id
        ):
            raise serializers.ValidationError(
                "Please provide one of `facility` or `facility_id`; but not both."
            )

        if has_facility and "preset" not in data:
            raise serializers.ValidationError(
                "Please provide `preset` if `facility` is specified"
            )

        return data

    def create(self, validated_data):  # noqa C901
        """
        Endpoint for initial setup of a device.
        Expects a value for:
        default language - the default language of this Kolibri device
        facility - the required fields for setting up a facility
        facilitydataset - facility configuration options
        superuser - the required fields for a facilityuser who will be set as the super user for this device
        """
        with transaction.atomic():
            if validated_data.get("facility"):
                facility_data = validated_data.pop("facility")
                facility_id = None
            else:
                facility_id = validated_data.pop("facility_id")
                facility_data = None

            if facility_id:
                try:
                    # We've already imported the facility to the device before provisioning
                    facility = Facility.objects.get(pk=facility_id)
                    preset = facility.dataset.preset
                    facility_created = False
                except Facility.DoesNotExist:
                    raise ParseError(
                        "Facility with id={0} does not exist".format(facility_id)
                    )
            else:
                try:
                    facility = Facility.objects.create(**facility_data)
                    preset = validated_data.pop("preset")
                    facility.dataset.preset = preset
                    facility.dataset.reset_to_default_settings(preset)
                    facility_created = True
                except Exception:
                    raise ParseError("Please check `facility` or `preset` fields.")

            custom_settings = validated_data.pop("settings")

            allow_learner_download_resources = False

            if facility_created:
                # We only want to update things about the facility or the facility dataset in the case
                # that we are creating the facility during this provisioning process.
                # If it has been imported as part of a whole facility import, then we should not be
                # making edits just now.
                # If it has been imported as part of a learner only device import, then editing
                # these things now will a) not be synced back, and b) will actively block future
                # syncing of updates to the facility or facility dataset from our 'upstream'.

                if "on_my_own_setup" in custom_settings:
                    facility.on_my_own_setup = custom_settings.pop("on_my_own_setup")
                    # If we are in on my own setup, then we want to allow learners to download resources
                    # to give them a seamless onboarding experience, without the need to use the device
                    # plugin to download resources en masse.
                    allow_learner_download_resources = True

                # overwrite the settings in dataset_data with validated_data.settings
                for key, value in custom_settings.items():
                    if value is not None:
                        setattr(facility.dataset, key, value)
                facility.dataset.save()

            auth_token = validated_data.pop("auth_token", None)

            if "superuser" in validated_data:
                superuser_data = validated_data["superuser"]
                # We've imported a facility if the username exists
                try:
                    superuser = FacilityUser.objects.get(
                        username=superuser_data["username"]
                    )
                except FacilityUser.DoesNotExist:
                    try:
                        # Otherwise we make the superuser
                        superuser = FacilityUser.objects.create_superuser(
                            superuser_data["username"],
                            superuser_data["password"],
                            facility=facility,
                            full_name=superuser_data.get("full_name"),
                        )
                    except Exception:
                        raise ParseError(
                            "`username`, `password`, or `full_name` are missing in `superuser`"
                        )
                if auth_token:
                    # If we have an auth token, we need to create an OSUser for the superuser
                    # so that we can associate the user with the OSUser
                    os_username, _ = interface.get_os_user(auth_token)
                    OSUser.objects.update_or_create(
                        os_username=os_username, defaults={"user": superuser}
                    )

            elif auth_token:
                superuser = FacilityUser.objects.get_or_create_os_user(
                    auth_token, facility=facility
                )
            else:
                raise ParseError(
                    "Either `superuser` or `auth_token` must be provided for provisioning"
                )

            is_soud = validated_data.pop("is_soud")

            if superuser:
                if facility_created:
                    # Only do this if this is a created, not imported facility.
                    facility.add_role(superuser, user_kinds.ADMIN)

                if DevicePermissions.objects.count() == 0:
                    DevicePermissions.objects.create(
                        user=superuser,
                        is_superuser=True,
                        can_manage_content=True,
                    )

            # Create device settings
            language_id = validated_data.pop("language_id")
            allow_guest_access = validated_data.pop("allow_guest_access")

            if allow_guest_access is None:
                allow_guest_access = preset != "formal"

            provisioning_data = {
                "device_name": validated_data["device_name"],
                "is_provisioned": validated_data["is_provisioned"],
                "language_id": language_id,
                "default_facility": facility,
                "allow_guest_access": allow_guest_access,
                "allow_learner_download_resources": allow_learner_download_resources,
            }

            if is_soud:
                provision_single_user_device(superuser, **provisioning_data)
            else:
                provision_device(**provisioning_data)

            # The API View expects these fields to be in the returned serialized data as well
            provisioning_data.update(
                {
                    "superuser": superuser,
                    "preset": preset,
                    "settings": custom_settings,
                }
            )
            return provisioning_data


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

        instance = super(DeviceSettingsSerializer, self).update(
            instance, validated_data
        )
        return instance

    def validate(self, data):
        data = super(DeviceSettingsSerializer, self).validate(data)
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
