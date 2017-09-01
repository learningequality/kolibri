"""
Kolibri configuration data
==========================

.. warning::
    Do not load any django.conf.settings stuff here. This configuration data
    precedes loading of settings, it is not part of the settings stack.

TODO: We need to figure out our conf API. Do we store in ini/json/yaml?

 * How do we retrieve config data?
 * When should configuration files be loaded and written?

This module should be easier to document, for instance by having VARIABLES
instead of a dict.

"""
from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
import os

from kolibri.utils.compat import module_exists

logger = logging.getLogger(__name__)

KOLIBRI_HOME = os.environ["KOLIBRI_HOME"]

# Creating KOLIBRI_HOME atm. has to happen here as for instance utils.cli is not
# called through py.test. This file is the first basic entry point of
# Kolibri, although utils.cli may or may not precede it.
if not os.path.exists(KOLIBRI_HOME):
    parent = os.path.dirname(KOLIBRI_HOME)
    if not os.path.exists(parent):
        raise RuntimeError("The parent of your KOLIBRI_HOME does not exist: {}".format(parent))
    os.mkdir(KOLIBRI_HOME)

#: Set defaults before updating the dict
config = {}

DEFAULT_PLUGINS = [
    # Note from Devon -
    # Temporarily adding these here to get things working for most devs.
    # It's not clear to me where the correct place to add them is.
    "kolibri.plugins.management",
    "kolibri.plugins.learn",
    "kolibri.plugins.document_pdf_render",
    "kolibri.plugins.html5_app_renderer",
    "kolibri.plugins.media_player",
    "kolibri.plugins.setup_wizard",
    "kolibri.plugins.coach",
    "kolibri.plugins.user",
    "kolibri_exercise_perseus_plugin"
]

#: Everything in this list is added to django.conf.settings.INSTALLED_APPS
config['INSTALLED_APPS'] = DEFAULT_PLUGINS

#: Well-known plugin names that are automatically searched for and enabled on
#: first-run.
config['AUTO_SEARCH_PLUGINS'] = []

#: If a config file does not exist, we assume it's the first run
config['FIRST_RUN'] = True

conf_file = os.path.join(KOLIBRI_HOME, "kolibri_settings.json")


def update(new_values):
    """
    Updates current configuration with ``new_values``. Does not save to file.
    """
    config.update(new_values)


def save(first_run=False):
    """Saves the current state of the configuration"""
    config['FIRST_RUN'] = first_run
    with open(conf_file, 'w') as kolibri_conf_file:
        json.dump(config, kolibri_conf_file, indent=2, sort_keys=True)


if not os.path.isfile(conf_file):
    logger.info("Initialize kolibri_settings.json..")
    save(True)
else:
    # Open up the config file and overwrite defaults
    with open(conf_file, 'r') as kolibri_conf_file:
        config.update(json.load(kolibri_conf_file))


def autoremove_unavailable_plugins():
    """
    Sanitize INSTALLED_APPS - something that should be done separately for all
    build in plugins, but we should not auto-remove plugins that are actually
    configured by the user or some other kind of hard dependency that should
    make execution stop if not loadable.
    """
    global config
    changed = False
    # Iterate over a copy of the list so that it is not modified during the loop
    for module_path in config['INSTALLED_APPS'][:]:
        if not module_exists(module_path):
            config['INSTALLED_APPS'].remove(module_path)
            logger.error(
                (
                    "Plugin {mod} not found and disabled. To re-enable it, run:\n"
                    "   $ kolibri plugin {mod} enable"
                ).format(mod=module_path)
            )
            changed = True
    if changed:
        save()


def enable_default_plugins():
    """
    Enable new plugins that have been added between versions
    This will have the undesired side effect of reactivating
    default plugins that have been explicitly disabled by a user.
    However, until we add disabled plugins to a blacklist, this is
    unavoidable.
    """
    global config
    changed = False
    for module_path in DEFAULT_PLUGINS:
        if module_path not in config['INSTALLED_APPS']:
            config['INSTALLED_APPS'].append(module_path)
            logger.warning(
                (
                    "Default plugin {mod} not found in configuration. To re-disable it, run:\n"
                    "   $ kolibri plugin {mod} disable"
                ).format(mod=module_path)
            )
            changed = True

    if changed:
        save()
