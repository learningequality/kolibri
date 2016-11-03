from __future__ import absolute_import, print_function, unicode_literals

# NB! This is not necessarily the version scheme we want, however having a good
# tracking of releases once we start doing lots of pre-releases is essential.
from .utils.version import get_version

# 'alpha' will automatically switch on the data-post fixing mechanism when
# building straight from a git repo-
# Example:
# 0.0.1.dev20160511132442
VERSION = (0, 1, 0, 'rc', 3)

__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'
__version__ = get_version(VERSION)
