from __future__ import annotations

import filecmp
import importlib.util
import logging
import re
import shutil
from pathlib import Path

from kolibri_app.config import KOLIBRI_HOME_TEMPLATE_DIR
from kolibri_app.globals import KOLIBRI_HOME_PATH

logger = logging.getLogger(__name__)

# HTML tags and entities
TAGRE = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")

# These Kolibri plugins will be dynamically enabled if they are
# available:
OPTIONAL_PLUGINS = [
    "kolibri_app_desktop_xdg_plugin",
    "kolibri_desktop_auth_plugin",
]


def init_kolibri():
    from kolibri.plugins.registry import registered_plugins
    from kolibri.plugins.utils import enable_plugin
    from kolibri.utils.cli import initialize, setup_logging

    registered_plugins.register_plugins(["kolibri.plugins.app"])
    enable_plugin("kolibri.plugins.app")

    available_plugins = [
        optional_plugin
        for optional_plugin in OPTIONAL_PLUGINS
        if importlib.util.find_spec(optional_plugin)
    ]

    registered_plugins.register_plugins(available_plugins)

    for plugin_name in available_plugins:
        logger.debug(f"Enabling optional plugin {plugin_name}")
        enable_plugin(plugin_name)

    setup_logging(debug=False)
    initialize()


def kolibri_update_from_home_template():
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

    logger.info("Copying KOLIBRI_HOME template to '{}'".format(KOLIBRI_HOME_PATH))

    for filename in compare.left_only:
        left_file = Path(compare.left, filename)
        right_file = Path(compare.right, filename)
        if left_file.is_dir():
            shutil.copytree(left_file, right_file)
        else:
            shutil.copy2(left_file, right_file)
