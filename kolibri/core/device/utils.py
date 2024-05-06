"""
Do all imports of the device settings model inside the function scope here,
so as to allow these functions to be easily imported without worrying about
circular imports.
"""
import json
import logging
import os
import platform

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError

import kolibri
from kolibri.core.auth.constants.facility_presets import mappings
from kolibri.core.content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION
from kolibri.utils.android import ANDROID_PLATFORM_SYSTEM_VALUE
from kolibri.utils.android import on_android
from kolibri.utils.lru_cache import lru_cache

logger = logging.getLogger(__name__)

LANDING_PAGE_SIGN_IN = "sign-in"
LANDING_PAGE_LEARN = "learn"

APP_KEY_COOKIE_NAME = "app_key_cookie"
APP_AUTH_TOKEN_COOKIE_NAME = "app_auth_token_cookie"


class DeviceNotProvisioned(Exception):
    pass


class DeviceAlreadyProvisioned(Exception):
    pass


no_default_value = object()


def get_device_setting(setting):
    """
    Get a device setting from the database, or return the default value if it is not set or
    the device is not provisioned.
    :param setting: a string key to the model attribute or property
    :return: the value of the setting
    """
    from .models import DeviceSettings
    from kolibri.core.auth.models import Facility

    try:
        device_settings = DeviceSettings.objects.get()
    except (
        DeviceSettings.DoesNotExist,
        OperationalError,
        ProgrammingError,
        Facility.DoesNotExist,
    ):
        # create an unsaved model object to leverage the defaults
        device_settings = DeviceSettings()

    return getattr(device_settings, setting)


def device_provisioned():
    return get_device_setting("is_provisioned")


def is_landing_page(landing_page):
    return get_device_setting("landing_page") == landing_page


def allow_guest_access():
    if device_provisioned() and get_device_setting("allow_guest_access"):
        return True

    return is_landing_page(LANDING_PAGE_LEARN)


def allow_learner_unassigned_resource_access():
    if get_device_setting("allow_learner_unassigned_resource_access"):
        return True

    return is_landing_page(LANDING_PAGE_LEARN)


def allow_peer_unlisted_channel_import():
    return get_device_setting("allow_peer_unlisted_channel_import")


def allow_other_browsers_to_connect():
    return get_device_setting("allow_other_browsers_to_connect")


def set_device_settings(**kwargs):
    """
    Set the device settings, even if unprovisioned.
    :param kwargs: a dictionary of key-value pairs to set on the device settings model
    """
    from .models import DeviceSettings

    try:
        device_settings = DeviceSettings.objects.get()
    except DeviceSettings.DoesNotExist:
        device_settings = DeviceSettings(
            # model field's default is a static value, which could change during unit tests
            language_id=settings.LANGUAGE_CODE
        )

    for key, value in kwargs.items():
        setattr(device_settings, key, value)

    device_settings.save()


def provision_device(device_name=None, is_provisioned=True, **kwargs):
    from .models import DeviceSettings

    if is_provisioned and device_provisioned():
        raise DeviceAlreadyProvisioned("Device has already been provisioned.")

    set_device_settings(**kwargs)
    device_settings = DeviceSettings.objects.get()
    if device_name is not None:
        device_settings.name = device_name
    device_settings.is_provisioned = is_provisioned
    device_settings.save()


def provision_single_user_device(user, **kwargs):
    from .models import DevicePermissions

    # if device has not been provisioned, set it up
    if not device_provisioned():
        provision_device(**kwargs)
        set_device_settings(subset_of_users_device=True)

    DevicePermissions.objects.get_or_create(
        user=user, defaults={"is_superuser": False, "can_manage_content": True}
    )


def valid_app_key(app_key):
    from .models import DeviceAppKey

    return app_key == DeviceAppKey.get_app_key()


def valid_app_key_on_request(request):
    return APP_KEY_COOKIE_NAME in request.COOKIES and valid_app_key(
        request.COOKIES.get(APP_KEY_COOKIE_NAME)
    )


def set_app_key_on_response(response, auth_token):
    from .models import DeviceAppKey

    response.set_cookie(APP_KEY_COOKIE_NAME, DeviceAppKey.get_app_key())

    if auth_token:
        response.set_cookie(APP_AUTH_TOKEN_COOKIE_NAME, auth_token, httponly=True)


def _check_setting(name, available, msg):
    if name not in available:
        raise ValueError(msg.format(name))


def check_facility_setting(name):
    AVAILABLE_SETTINGS = [
        "learner_can_edit_username",
        "learner_can_edit_name",
        "learner_can_edit_password",
        "learner_can_sign_up",
        "learner_can_delete_account",
        "learner_can_login_with_no_password",
        "show_download_button_in_learn",
    ]
    _check_setting(
        name,
        AVAILABLE_SETTINGS,
        "'{}' is not a facility setting that can be changed by this command",
    )


def check_device_setting(name):
    AVAILABLE_SETTINGS = [
        "language_id",
        "landing_page",
        "allow_guest_access",
        "allow_peer_unlisted_channel_import",
        "allow_learner_unassigned_resource_access",
        "name",
        "allow_other_browsers_to_connect",
    ]
    _check_setting(
        name,
        AVAILABLE_SETTINGS,
        "'{}' is not a device setting that can be changed by this command",
    )


def validate_facility_settings(new_settings):
    # Override any settings passed in
    for key in new_settings:
        check_facility_setting(key)
    return new_settings


def validate_device_settings(facility=None, **new_settings):
    # Override any settings passed in
    for key in new_settings:
        check_device_setting(key)

    settings_to_set = dict(new_settings)
    if "language_id" in new_settings:
        settings_to_set["language_id"] = new_settings["language_id"]
    if facility is not None:
        settings_to_set["default_facility"] = facility

    return settings_to_set


def create_facility(facility_name=None, preset=None):
    from kolibri.core.auth.models import Facility

    facility = Facility.objects.create(name=facility_name)
    logger.info("Facility with name '{name}' created.".format(name=facility.name))

    # Only set preset data if we have created the facility, otherwise leave previous data intact
    if preset:
        dataset_data = mappings[preset]
        facility.dataset.preset = preset
        for key, value in dataset_data.items():
            setattr(facility.dataset, key, value)
        facility.dataset.save()
        logger.info("Facility preset changed to {preset}.".format(preset=preset))
    return facility


def setup_device_and_facility(
    facility,
    facility_name,
    preset,
    facility_settings,
    device_settings,
    username,
    password,
):
    from kolibri.core.auth.models import FacilityUser

    with transaction.atomic():
        if facility is None and facility_name is not None:
            facility = create_facility(
                facility_name=facility_name,
                preset=preset,
            )

            if facility_settings:
                for key, value in facility_settings.items():
                    setattr(facility.dataset, key, value)
                facility.dataset.save()
                logger.info(
                    "Facility settings updated with {}".format(facility_settings)
                )

        provision_device(**device_settings)
        logger.info("Device settings updated with {}".format(device_settings))

        if username and password and facility:
            try:
                FacilityUser.objects.create_superuser(
                    username, password, facility=facility
                )
                logger.info(
                    "Superuser created with username '{username}' in facility '{facility}'.".format(
                        username=username, facility=facility
                    )
                )
            except ValidationError:
                logger.warning(
                    "An account with username '{username}' already exists in facility '{facility}', not creating user account.".format(
                        username=username, facility=facility
                    )
                )


def get_facility_by_name(facility_name):
    from kolibri.core.auth.models import Facility

    facility = None

    if facility_name:
        facility_query = Facility.objects.filter(name__iexact=facility_name)

        if facility_query.exists():
            facility = facility_query.get()
            logger.warning(
                "Facility with name '{name}' already exists, not modifying preset.".format(
                    name=facility.name
                )
            )
    else:
        facility = Facility.get_default_facility() or Facility.objects.first()

    return facility


def remove_provisioning_file(file_path):
    try:
        os.unlink(file_path)
        logger.info(
            "Removed automatic provisioning file {} after successful provisioning".format(
                file_path
            )
        )
    except (IOError, OSError):
        logger.warning(
            "Unable to remove provisioning file {} after successful provisioning".format(
                file_path
            ),
        )


def provision_from_file(file_path):
    """
    Expects a JSON file with the following format (example values supplied):
    {
        "facility_name": "My Facility",
        "preset": "formal",
        "facility_settings": {
            "learner_can_edit_username": true,
            "learner_can_edit_name": true,
            "learner_can_edit_password": true,
            "learner_can_sign_up": true,
            "learner_can_delete_account": true,
            "learner_can_login_with_no_password": true,
            "show_download_button_in_learn": true
        },
        "device_settings": {
            "language_id": "en",
            "landing_page": "learn",
            "allow_guest_access": true,
            "allow_peer_unlisted_channel_import": true,
            "allow_learner_unassigned_resource_access": true,
            "name": "My Device",
            "allow_other_browsers_to_connect": true
        },
        "superuser": {
            "username": "superuser",
            "password": "password"
        }
    }
    All fields are optional.
    """
    if device_provisioned():
        raise ValidationError("Device is already provisioned")

    if not os.path.exists(file_path):
        raise ValidationError("File {} does not exist".format(file_path))

    try:
        with open(file_path, "r") as f:
            options = json.load(f)
    except IOError:
        raise ValidationError("File {} could not be opened".format(file_path))
    except ValueError:
        raise ValidationError("File {} did not contain valid JSON".format(file_path))

    facility_name = options.get("facility_name")

    facility = get_facility_by_name(facility_name)

    try:
        device_settings = validate_device_settings(**options.get("device_settings", {}))
    except ValueError:
        raise ValidationError(
            "Invalid device settings specified in {}.".format(file_path)
        )

    try:
        facility_settings = validate_facility_settings(
            options.get("facility_settings", {})
        )
    except ValueError:
        raise ValidationError(
            "Invalid facility settings specified in {}.".format(file_path)
        )

    preset = options.get("preset")
    username = options.get("superuser", {}).get("username")
    password = options.get("superuser", {}).get("password")

    setup_device_and_facility(
        facility,
        facility_name,
        preset,
        facility_settings,
        device_settings,
        username,
        password,
    )

    remove_provisioning_file(file_path)


device_info_keys = {
    "1": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
    ],
    "2": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
        "subset_of_users_device",
    ],
    "3": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
        "subset_of_users_device",
        "min_content_schema_version",
    ],
}

DEVICE_INFO_VERSION = "3"


def get_device_info(version=DEVICE_INFO_VERSION):
    """
    Returns metadata information about the device
    The default kwarg version should always be the latest
    version of device info that this function supports.
    We maintain historic versions for backwards compatibility
    """

    if version not in device_info_keys:
        version = DEVICE_INFO_VERSION

    from morango.models import InstanceIDModel

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]
    if device_provisioned():
        device_name = get_device_setting("name")
        subset_of_users_device = get_device_setting("subset_of_users_device")
    else:
        device_name = instance_model.hostname
        subset_of_users_device = False

    all_info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": device_name,
        "operating_system": ANDROID_PLATFORM_SYSTEM_VALUE
        if on_android()
        else platform.system(),
        "subset_of_users_device": subset_of_users_device,
        "min_content_schema_version": MIN_CONTENT_SCHEMA_VERSION,
    }

    info = {}

    # By this point, we have validated that the version is in device_info_keys
    for key in device_info_keys.get(version, []):
        info[key] = all_info[key]

    return info


@lru_cache()
def is_full_facility_import(dataset_id):
    """
    Returns True if this the dataset_id holds a facility that has been fully imported.
    """
    from morango.models.certificates import Certificate
    from kolibri.core.auth.constants.morango_sync import ScopeDefinitions

    return (
        Certificate.objects.get(id=dataset_id)
        .get_descendants(include_self=True)
        .exclude(_private_key__isnull=True)
        .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
        .exists()
    )
