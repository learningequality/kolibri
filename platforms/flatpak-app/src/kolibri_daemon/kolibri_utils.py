from __future__ import annotations

import filecmp
import importlib.util
import json
import logging
import os
import shutil
import typing
from pathlib import Path

from kolibri_app.config import KOLIBRI_HOME_TEMPLATE_DIR
from kolibri_app.globals import KOLIBRI_HOME_PATH

from .content_extensions_manager import ContentExtensionsManager

logger = logging.getLogger(__name__)

# These Kolibri plugins must be enabled for the application to function:
REQUIRED_PLUGINS = [
    "kolibri.plugins.app",
]

# These Kolibri plugins will be automatically enabled if they are available:
OPTIONAL_PLUGINS = [
    "kolibri_app_desktop_xdg_plugin",
    "kolibri_desktop_auth_plugin",
    "kolibri_dynamic_collections_plugin",
    "kolibri_zim_plugin",
]

# TODO: Automatically enable plugins from flatpak plugin extensions.


def init_kolibri(**kwargs):
    _kolibri_update_from_home_template()

    _init_kolibri_env()

    from kolibri.utils.main import initialize

    for plugin_name in REQUIRED_PLUGINS:
        _enable_kolibri_plugin(plugin_name)

    for plugin_name in OPTIONAL_PLUGINS:
        _enable_kolibri_plugin(plugin_name, optional=True)

    initialize(**kwargs)


def _init_kolibri_env():
    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.kolibri_settings"

    # Kolibri defaults to a very large thread pool. Because we expect this
    # application to be used in a single user environment with a limited
    # workload, we can use a smaller number of threads.
    os.environ.setdefault("KOLIBRI_CHERRYPY_THREAD_POOL", "10")

    # Automatically provision with $KOLIBRI_HOME/automatic_provision.json if it
    # exists.
    # TODO: Once kolibri-gnome supports automatic login for all cases, use an
    #       included automatic provision file by default.
    automatic_provision_path = _get_automatic_provision_path()
    if automatic_provision_path:
        os.environ.setdefault(
            "KOLIBRI_AUTOMATIC_PROVISION_FILE", automatic_provision_path.as_posix()
        )

    content_extensions_manager = ContentExtensionsManager()
    content_extensions_manager.apply(os.environ)


def _enable_kolibri_plugin(plugin_name: str, optional=False) -> bool:
    from kolibri.plugins import config as plugins_config
    from kolibri.plugins.registry import registered_plugins
    from kolibri.plugins.utils import enable_plugin

    if optional and not importlib.util.find_spec(plugin_name):
        return False

    if plugin_name not in plugins_config.ACTIVE_PLUGINS:
        logger.info(f"Enabling plugin {plugin_name}")
        registered_plugins.register_plugins([plugin_name])
        enable_plugin(plugin_name)

    return True


def _get_automatic_provision_path() -> typing.Optional[Path]:
    path = KOLIBRI_HOME_PATH.joinpath("automatic_provision.json")

    if not path.is_file():
        return None

    return path


def _kolibri_update_from_home_template():
    """
    Construct a Kolibri home directory based on the Kolibri home template, if
    necessary.
    """

    # TODO: This code should probably be in Kolibri itself

    kolibri_home_template_dir = Path(KOLIBRI_HOME_TEMPLATE_DIR)

    if not kolibri_home_template_dir.is_dir():
        return

    if not KOLIBRI_HOME_PATH.is_dir():
        KOLIBRI_HOME_PATH.mkdir(parents=True, exist_ok=True)

    compare = filecmp.dircmp(
        kolibri_home_template_dir,
        KOLIBRI_HOME_PATH,
        ignore=["logs", "job_storage.sqlite3"],
    )

    if len(compare.common) > 0:
        return

    # If Kolibri home was not already initialized, copy files from the
    # template directory to the new home directory.

    logger.info(f"Copying KOLIBRI_HOME template to '{KOLIBRI_HOME_PATH.as_posix()}'")

    for filename in compare.left_only:
        left_file = Path(compare.left, filename)
        right_file = Path(compare.right, filename)
        if left_file.is_dir():
            shutil.copytree(left_file, right_file)
        else:
            shutil.copy2(left_file, right_file)
