from kolibri.utils.i18n import KOLIBRI_LANGUAGE_INFO
from kolibri_app.constants import WINDOWS

option_defaults = {
    "Deployment": {
        "HTTP_PORT": 0,
        # Single-user desktop app: keep the session alive indefinitely
        "AUTO_LOGOUT_TIME": 0,
    }
}

if WINDOWS:
    from kolibri_app.windows_registry import get_installer_language

    installer_language = get_installer_language()
    if installer_language in KOLIBRI_LANGUAGE_INFO:
        option_defaults["Deployment"]["DEFAULT_LANGUAGE"] = installer_language
