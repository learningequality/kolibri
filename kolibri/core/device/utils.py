"""
Do all imports of the device settings model inside the function scope here,
so as to allow these functions to be easily imported without worrying about
circular imports.
"""
import json
import logging
import os

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError

from kolibri.core.auth.constants.facility_presets import mappings

logger = logging.getLogger(__name__)

LANDING_PAGE_SIGN_IN = "sign-in"
LANDING_PAGE_LEARN = "learn"

APP_KEY_COOKIE_NAME = "app_key_cookie"


class DeviceNotProvisioned(Exception):
    pass


no_default_value = object()


def get_device_setting(setting, default=no_default_value):
    from .models import DeviceSettings
    from kolibri.core.auth.models import Facility

    try:
        device_settings = DeviceSettings.objects.get()
        if device_settings is None:
            raise DeviceSettings.DoesNotExist
        return getattr(device_settings, setting)
    except (DeviceSettings.DoesNotExist, OperationalError, ProgrammingError):
        if default is not no_default_value:
            return default
        raise DeviceNotProvisioned
    except Facility.DoesNotExist:
        return None


def device_provisioned():
    return get_device_setting("is_provisioned", False)


def is_landing_page(landing_page):
    return get_device_setting("landing_page", LANDING_PAGE_SIGN_IN) == landing_page


def allow_guest_access():
    if get_device_setting("allow_guest_access", False):
        return True

    return is_landing_page(LANDING_PAGE_LEARN)


def allow_learner_unassigned_resource_access():
    if get_device_setting("allow_learner_unassigned_resource_access", True):
        return True

    return is_landing_page(LANDING_PAGE_LEARN)


def allow_peer_unlisted_channel_import():
    return get_device_setting("allow_peer_unlisted_channel_import", False)


def allow_other_browsers_to_connect():
    return get_device_setting("allow_other_browsers_to_connect", True)


def set_device_settings(**kwargs):
    from .models import DeviceSettings

    try:
        device_settings = DeviceSettings.objects.get()
        for key, value in kwargs.items():
            setattr(device_settings, key, value)
        device_settings.save()
    except DeviceSettings.DoesNotExist:
        raise DeviceNotProvisioned


def provision_device(device_name=None, **kwargs):
    from .models import DeviceSettings

    device_settings, _ = DeviceSettings.objects.get_or_create(defaults=kwargs)
    if device_name is not None:
        device_settings.name = device_name
    device_settings.is_provisioned = True
    device_settings.save()


def provision_single_user_device(user):
    from .models import DevicePermissions

    # if device has not been provisioned, set it up
    if not device_provisioned():
        provision_device(default_facility=user.facility)
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


def set_app_key_on_response(response):
    from .models import DeviceAppKey

    response.set_cookie(APP_KEY_COOKIE_NAME, DeviceAppKey.get_app_key())


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


def validate_device_settings(language_id=None, facility=None, **new_settings):
    # Override any settings passed in
    for key in new_settings:
        check_device_setting(key)

    settings_to_set = dict(new_settings)
    if language_id is not None:
        settings_to_set["language_id"] = language_id
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
                logger.warn(
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
            logger.warn(
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
        logger.warn(
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
