"""
Utility functions for working with Python modules.
Currently provides a helper function to check if a module exists without importing it.
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
