"""
CAUTION! Keep everything here at at minimum. Do not import stuff.
Do not import dependencies here.
"""

from kolibri.utils import env

# Setup the environment before loading anything else from the application
env.set_env()

# Redundant alias marks __version__ as an explicit re-export (ruff F401)
from kolibri._version import __version__ as __version__  # noqa: E402

__author__ = "Learning Equality"
__email__ = "info@learningequality.org"
