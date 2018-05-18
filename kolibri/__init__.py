
"""
CAUTION! Keep everything here at at minimum. Do not import stuff.
This module is imported in setup.py, so you cannot for instance
import a dependency.
"""

from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .utils import env
from .utils.version import get_kolibri_version

# Setup the environment before loading anything else from the application
env.set_env()

# A tuple containing the major, minor, and patch version numbers
BASE_VERSION = (0, 10, 0)

# Full version information, including pre-release info
VERSION_INFO = get_kolibri_version(BASE_VERSION)

# version string used by runtime environments (e.g. PyPi and setuptools)
__version__ = VERSION_INFO.pep440_str

# additional metadata
__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'

