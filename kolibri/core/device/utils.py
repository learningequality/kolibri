"""
Do all imports of the device settings model inside the function scope here,
so as to allow these functions to be easily imported without worrying about
circular imports.
"""
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError


class DeviceNotProvisioned(Exception):
    pass


no_default_value = object()


def get_device_setting(setting, default=no_default_value):
    from .models import DeviceSettings

    try:
        device_settings = DeviceSettings.objects.get()
        return getattr(device_settings, setting)
    except (
        DeviceSettings.DoesNotExist,
        OperationalError,
        ProgrammingError,
    ):
        if default is not no_default_value:
            return default
        raise DeviceNotProvisioned


def device_provisioned():
    return get_device_setting("is_provisioned", False)


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
