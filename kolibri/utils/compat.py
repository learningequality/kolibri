"""
Compatibility layer for Python 2+3
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import sys

from pkg_resources import parse_version as _parse_version


def module_exists(module_path):
    """
    Determines if a module exists without loading it (Python 3)
    In Python 2, the module will be loaded
    """
    if sys.version_info >= (3, 4):
        from importlib.util import find_spec

        try:
            return find_spec(module_path) is not None
        except ImportError:
            return False
    elif sys.version_info < (3,):
        from imp import find_module

        try:
            if "." in module_path:
                __import__(module_path)
            else:
                find_module(module_path)
            return True
        except ImportError:
            return False
    else:
        raise NotImplementedError("No compatibility with Python 3.0 and 3.2")


class VersionCompat(object):
    """
    This is an exactly-what-we-need version of the newer
    packaging.version.Version object.

    It is made to exclusively filter out properties of the later
    ``packaging.version.Version`` that we should not access because they are
    unsupported.

    So please avoid using anything directly from ``packaging.version.Version``
    """

    def __init__(self, tpl_or_version):
        self.tpl_or_version = tpl_or_version

    @property
    def base_version(self):
        # if it's a real Version object...
        if hasattr(self.tpl_or_version, "base_version"):
            return self.tpl_or_version.base_version

        # Otherwise assume we have the old tuple with strings.

        # Remove leading 0's
        self.tpl_or_version = map(lambda s: s.lstrip("0"), self.tpl_or_version)
        self.tpl_or_version = map(lambda s: s or "0", self.tpl_or_version)
        # Replace * with 0 because * seems to appear for instance as 0.8.*
        self.tpl_or_version = map(lambda s: s.replace("*", "0"), self.tpl_or_version)
        # When map returns a map object in Python 3...
        self.tpl_or_version = tuple(self.tpl_or_version)

        # Always just assume the first 3 members of the tuple... because this
        # is Kolibri's version scheme (For instance, version 1 is always
        # 1.0.0)
        return ".".join(self.tpl_or_version[:3])


def parse_version(v):
    """
    In old versions of Python (for instance on Ubuntu 14.04),
    pkg_resources.parse_version returns a tuple and not a version object.
    """
    parsed = _parse_version(v)

    return VersionCompat(parsed)
