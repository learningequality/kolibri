"""
CAUTION! Keep everything here at at minimum. Do not import stuff.
This module is imported in setup.py, so you cannot for instance
import a dependency.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .utils import env
from .utils.version import get_version

# Setup the environment before loading anything else from the application
env.set_env()

#: This may not be the exact version as it's subject to modification with
#: get_version() - use ``kolibri.__version__`` for the exact version string.
VERSION = (0, 13, 0, "beta", 0)

__author__ = "Learning Equality"
__email__ = "info@learningequality.org"
__version__ = str(get_version(VERSION))


#: A list of all available plugins defined within the Kolibri repo
#: Define it here to avoid introspection malarkey, and to allow for
#: import in setup.py for creating a list of plugin entry points.
INTERNAL_PLUGINS = [
    "kolibri.plugins.facility",
    "kolibri.plugins.device",
    "kolibri.plugins.learn",
    "kolibri.plugins.pdf_viewer",
    "kolibri.plugins.html5_viewer",
    "kolibri.plugins.media_player",
    "kolibri.plugins.setup_wizard",
    "kolibri.plugins.coach",
    "kolibri.plugins.user",
    "kolibri.plugins.style_guide",
    "kolibri.plugins.epub_viewer",
    "kolibri.plugins.default_theme",
    "kolibri.plugins.slideshow_viewer",
]
