"""
Do all imports of the device settings model inside the function scope here,
so as to allow these functions to be easily imported without worrying about
circular imports.
"""
from django.db.utils import OperationalError
from django.db.utils import ProgrammingError

LANDING_PAGE_SIGN_IN = "sign-in"
LANDING_PAGE_LEARN = "learn"

APP_KEY_COOKIE_NAME = "app_key_cookie"


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


def create_superuser(user_data, facility):
    from .models import DevicePermissions
    from kolibri.core.auth.models import FacilityUser
    from django.core.exceptions import ValidationError

    username = user_data.get("username")
    password = user_data.get("password")
    full_name = user_data.get("full_name")

    # Code copied from FacilityUserModelManager (create_superuser method doesn't work)
    if FacilityUser.objects.filter(
        username__iexact=username, facility=facility
    ).exists():
        raise ValidationError("An account with that username already exists")

    # gender and birth_year are set to "DEFERRED", since superusers do not
    # need to provide this and are not nudged to update profile on Learn page
    superuser = FacilityUser.objects.create(
        full_name=full_name or username,
        username=username,
        password=password,
        facility=facility,
        gender="DEFERRED",
        birth_year="DEFERRED",
    )

    superuser.full_clean()
    superuser.set_password(password)
    superuser.save()

    # make the user a facility admin
    facility.add_admin(superuser)

    # make the user into a superuser on this device
    DevicePermissions.objects.create(
        user=superuser, is_superuser=True, can_manage_content=True
    )
    return superuser


def provision_device(device_name=None, **kwargs):
    from .models import DeviceSettings

    device_settings, _ = DeviceSettings.objects.get_or_create(defaults=kwargs)
    if device_name is not None:
        device_settings.name = device_name
    device_settings.is_provisioned = True
    device_settings.save()


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
