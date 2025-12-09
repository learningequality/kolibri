import logging

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ParseError

from kolibri.core.analytics.tasks import schedule_ping
from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.constants.facility_presets import choices
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.serializers import FacilitySerializer
from kolibri.core.auth.utils.deprovision import deprovision
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import OSUser
from kolibri.core.device.serializers import DeviceSerializerMixin
from kolibri.core.device.serializers import NoFacilityFacilityUserSerializer
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_single_user_device
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.permissions import FirstProvisioning
from kolibri.core.tasks.permissions import IsDeviceUnusable
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.validation import JobValidator
from kolibri.core.utils.token_generator import TokenGenerator
from kolibri.plugins.app.utils import GET_OS_USER
from kolibri.plugins.app.utils import interface

logger = logging.getLogger(__name__)

PROVISION_TASK_QUEUE = "device_provision"
DEPROVISION_TASK_QUEUE = "device_deprovision"


class DeviceProvisionValidator(DeviceSerializerMixin, JobValidator):
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

    def validate(self, data):
        if (
            GET_OS_USER in interface
            and self.context.get("request") is not None
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

        return super().validate(data)


@register_task(
    validator=DeviceProvisionValidator,
    permission_classes=[FirstProvisioning],
    cancellable=False,
    queue=PROVISION_TASK_QUEUE,
)
def provisiondevice(**data):  # noqa C901
    """
    Task for initial setup of a device.
    Expects a value for:
    default language - the default language of this Kolibri device
    facility - the required fields for setting up a facility
    facilitydataset - facility configuration options
    superuser - the required fields for a facilityuser who will be set as the super user for this device
    """
    with transaction.atomic():
        if data.get("facility"):
            facility_data = data.pop("facility")
            facility_id = None
        else:
            facility_id = data.pop("facility_id")
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
                preset = data.pop("preset")
                facility.dataset.preset = preset
                facility.dataset.reset_to_default_settings(preset)
                facility_created = True
            except Exception:
                raise ParseError("Please check `facility` or `preset` fields.")

        custom_settings = data.pop("settings")

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

            # overwrite the settings in dataset_data with data.settings
            for key, value in custom_settings.items():
                if value is not None:
                    setattr(facility.dataset, key, value)
            facility.dataset.save()

        auth_token = data.pop("auth_token", None)

        superuser_created = False

        if "superuser" in data:
            superuser_data = data["superuser"]
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
                    superuser_created = True
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

        is_soud = data.pop("is_soud", True)

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
        language_id = data.pop("language_id")
        allow_guest_access = data.pop("allow_guest_access")

        if allow_guest_access is None:
            allow_guest_access = preset != "formal"

        provisioning_data = {
            "device_name": data["device_name"],
            "is_provisioned": data["is_provisioned"],
            "language_id": language_id,
            "default_facility": facility,
            "allow_guest_access": allow_guest_access,
            "allow_learner_download_resources": allow_learner_download_resources,
        }

        if is_soud:
            provision_single_user_device(superuser, **provisioning_data)
            # Restart zeroconf before moving along when we're a SoUD
            from kolibri.utils.server import update_zeroconf_broadcast

            update_zeroconf_broadcast()
        else:
            provision_device(**provisioning_data)

        schedule_ping()  # Trigger telemetry pingback after we've provisioned

        job = get_current_job()
        if job:
            updates = {
                "facility_id": facility.id,
                "superuser_id": superuser.id if superuser else None,
                "username": superuser.username if superuser else None,
            }

            # If superuser was imported, and learners are not allowed to log in
            # without a password, then we will need a token so that the frontend can
            # authenticate the superuser in case it does not know the password.
            if (
                not superuser_created
                and not facility.dataset.learner_can_login_with_no_password
            ):
                updates["auth_token"] = TokenGenerator().make_token(superuser.id)

            job.update_metadata(**updates)


@register_task(
    permission_classes=[IsDeviceUnusable],
    cancellable=False,
    queue=DEPROVISION_TASK_QUEUE,
)
def deprovisiondevice():
    """
    Task for deprovisioning a device.
    """
    deprovision()
