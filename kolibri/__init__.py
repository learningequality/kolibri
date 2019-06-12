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
<<<<<<< 4e0397ffa164455ea975c6a65bb3ad56b0af74a7
VERSION = (0, 13, 0, "alpha", 0)
=======
VERSION = (0, 12, 4, "final", 0)
>>>>>>> Update VERSION for 0.12.4

__author__ = "Learning Equality"
__email__ = "info@learningequality.org"
__version__ = str(get_version(VERSION))
