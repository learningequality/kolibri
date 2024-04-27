from __future__ import annotations

import importlib.util
import json
import logging
import os
import platform
import tempfile
from gettext import gettext as _
from pathlib import Path

from .content_extensions_manager import ContentExtensionsManager

logger = logging.getLogger(__name__)

# These Kolibri plugins must be enabled for the application to function:
REQUIRED_PLUGINS = [
    "kolibri.plugins.app",
]

# These Kolibri plugins will be automatically enabled if they are available:
OPTIONAL_PLUGINS = [
    "kolibri_app_desktop_xdg_plugin",
    "kolibri_dynamic_collections_plugin",
    "kolibri_zim_plugin",
]

# TODO: Automatically enable plugins from flatpak plugin extensions.


def init_kolibri(**kwargs):
    _init_kolibri_env()

    from kolibri.utils.main import initialize

    for plugin_name in REQUIRED_PLUGINS:
        _enable_kolibri_plugin(plugin_name)

    for plugin_name in OPTIONAL_PLUGINS:
        _enable_kolibri_plugin(plugin_name, optional=True)

    initialize(**kwargs)


def _init_kolibri_env():
    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.kolibri_settings"
    os.environ["KOLIBRI_PROJECT"] = "kolibri-gnome"

    # Kolibri defaults to a very large thread pool. Because we expect this
    # application to be used in a single user environment with a limited
    # workload, we can use a smaller number of threads.
    os.environ.setdefault("KOLIBRI_CHERRYPY_THREAD_POOL", "10")

    content_extensions_manager = ContentExtensionsManager()
    content_extensions_manager.apply(os.environ)


def _enable_kolibri_plugin(plugin_name: str, optional=False) -> bool:
    from kolibri.plugins import config as plugins_config
    from kolibri.plugins.utils import enable_plugin

    if optional and not importlib.util.find_spec(plugin_name):
        return False

    if plugin_name not in plugins_config.ACTIVE_PLUGINS:
        logger.info(f"Enabling plugin {plugin_name}")
        enable_plugin(plugin_name)

    return True


def kolibri_automatic_provision():
    from kolibri.core.device.utils import device_provisioned
    from kolibri.core.device.utils import provision_from_file

    if device_provisioned():
        return

    # It is better to create a TemporaryDirectory containing a file, because
    # provision_from_file deals with file paths instead of open files, and it
    # deletes the provided file, which confuses tempfile.NamedTemporaryFile.
    with tempfile.TemporaryDirectory() as directory:
        file = Path(directory, "automatic_provision.json").open("w")
        json.dump(_get_automatic_provision_data(), file)
        file.flush()
        provision_from_file(file.name)


def _get_automatic_provision_data() -> dict:
    facility_name = _("Kolibri on {host}").format(host=platform.node() or "localhost")
    return {
        "facility_name": facility_name,
        "preset": "formal",
        "facility_settings": {
            "learner_can_login_with_no_password": False,
        },
        "device_settings": {
            # Kolibri interprets None as "the system language at setup time",
            # while an empty string causes Kolibri to always use the current
            # browser language:
            # <https://github.com/learningequality/kolibri/issues/11248>
            "language_id": "",
            "landing_page": "learn",
            "allow_guest_access": False,
            "allow_other_browsers_to_connect": False,
        },
        "superuser": {
            "username": None,
            "password": None,
        },
    }
