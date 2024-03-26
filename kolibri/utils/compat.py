"""
Compatibility layer for Python 2+3
"""
from importlib.util import find_spec


def module_exists(module_path):
    """
    Determines if a module exists without loading it
    """

    try:
        return find_spec(module_path) is not None
    except ImportError:
        return False
