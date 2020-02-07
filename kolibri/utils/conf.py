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
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os

from django.utils.functional import SimpleLazyObject

logger = logging.getLogger(__name__)

#: Absolute path of the main user data directory.
#: Will be created automatically if it doesn't exist.
KOLIBRI_HOME = os.path.abspath(os.path.expanduser(os.environ["KOLIBRI_HOME"]))

# Creating KOLIBRI_HOME atm. has to happen here as for instance utils.cli is not
# called through py.test. This file is the first basic entry point of
# Kolibri, although utils.cli may or may not precede it.
if not os.path.exists(KOLIBRI_HOME):
    parent = os.path.dirname(KOLIBRI_HOME)
    if not os.path.exists(parent):
        raise RuntimeError(
            "The parent of your KOLIBRI_HOME does not exist: {}".format(parent)
        )
    os.mkdir(KOLIBRI_HOME)

# Create a folder named logs inside KOLIBRI_HOME to store all the log files.
LOG_ROOT = os.path.join(KOLIBRI_HOME, "logs")
if not os.path.exists(LOG_ROOT):
    os.mkdir(LOG_ROOT)


def __initialize_options():
    # read the config file options in here so they can be accessed from a standard location
    from .options import read_options_file

    return read_options_file(KOLIBRI_HOME)


OPTIONS = SimpleLazyObject(__initialize_options)

# Generate an options.ini inside the KOLIBRI_HOME as default config
try:
    options_path = os.path.join(KOLIBRI_HOME, "options.ini")
    if not os.path.exists(options_path):
        file = open(options_path, "w")
        for k, v in OPTIONS.items():
            file.write("[%s] \n" % (k))
            loop_count = 0
            for k_child, v_child in v.items():
                loop_count += 1
                if loop_count != len(v):
                    file.write("%s = %s \n" % (k_child, v_child))
                else:
                    file.write("%s = %s \n\n" % (k_child, v_child))
        file.close()
except IOError:
    pass
