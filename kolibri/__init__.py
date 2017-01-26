from __future__ import absolute_import, print_function, unicode_literals

# NB! This is not necessarily the version scheme we want, however having a good
# tracking of releases once we start doing lots of pre-releases is essential.
from .utils.version import derive_version_from_git_tag, derive_version_from_version_file, get_version

__author__ = 'Learning Equality'
__email__ = 'info@learningequality.org'
__version__ = str(
    derive_version_from_git_tag() or derive_version_from_version_file()
)
