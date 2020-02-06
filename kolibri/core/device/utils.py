"""
Do all imports of the device settings model inside the function scope here,
so as to allow these functions to be easily imported without worrying about
circular imports.
"""
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError

LANDING_PAGE_SIGN_IN = "sign-in"
LANDING_PAGE_LEARN = "learn"


class DeviceNotProvisioned(Exception):
    pass


no_default_value = object()


def get_device_setting(setting, default=no_default_value):
    from .models import DeviceSettings

    try:
        device_settings = DeviceSettings.objects.get()
        if device_settings is None:
            raise DeviceSettings.DoesNotExist
        return getattr(device_settings, setting)
    except (DeviceSettings.DoesNotExist, OperationalError, ProgrammingError):
        if default is not no_default_value:
            return default
        raise DeviceNotProvisioned


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


def set_device_settings(**kwargs):
    from .models import DeviceSettings

    try:
        device_settings = DeviceSettings.objects.get()
        for key, value in kwargs.items():
            setattr(device_settings, key, value)
        device_settings.save()
    except DeviceSettings.DoesNotExist:
        raise DeviceNotProvisioned


def provision_device(**kwargs):
    from .models import DeviceSettings

    device_settings, _ = DeviceSettings.objects.get_or_create(defaults=kwargs)
    device_settings.is_provisioned = True
    device_settings.save()
