from __future__ import absolute_import, print_function, unicode_literals

# NB! This is not necessarily the version scheme we want, however having a good
# tracking of releases once we start doing lots of pre-releases is essential.
from .utils.version import get_version

__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'
__version__ = str(get_version('kolibri', __file__))
