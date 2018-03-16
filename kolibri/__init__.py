from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .utils.version import get_version

#: This may not be the exact version as it's subject to modification with
#: get_version() - use ``kolibri.__version__`` for the exact version string.
VERSION = (0, 8, 0, 'final', 0)

__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'
__version__ = str(get_version(VERSION))
