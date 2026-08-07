"""
Frozen table to column maps, one module per content schema version.
"""

import importlib
import os

from kolibri.core.content.constants.schema_versions import (
    coerce_version_name_to_valid_module_path,
)
from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS


def _module_name(version):
    return "content_columns_" + coerce_version_name_to_valid_module_path(version)


def module_path(version):
    return os.path.join(os.path.dirname(__file__), _module_name(version) + ".py")


def for_version(version):
    """
    A content schema version's table names mapped to its column names, in
    declaration order.
    """
    if version not in CONTENT_DB_SCHEMA_VERSIONS:
        raise ValueError("Unknown content schema version {}".format(version))
    return importlib.import_module("." + _module_name(version), __name__).COLUMNS
