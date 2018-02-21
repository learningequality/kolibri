from __future__ import absolute_import, print_function, unicode_literals
from .utils.version import get_version

#: This may not be the exact version as it's subject to modification with
#: get_version() - use ``kolibri.__version__`` for the exact version string.
VERSION = (0, 7, 2, 'final', 0)

__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'
__version__ = str(get_version(VERSION))
