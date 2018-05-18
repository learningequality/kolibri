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

