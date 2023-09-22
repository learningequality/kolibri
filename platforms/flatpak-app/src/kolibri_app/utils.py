from __future__ import annotations

import os


def getenv_as_bool(key: str, default: bool = False) -> bool:
    # List of strings to interpret as True or False, copied from strtobool() in
    # distutils. The distutils module is deprecated since Python 3.10.
    TRUTHY_STRINGS = ("y", "yes", "t", "true", "on", "1")
    FALSY_STRINGS = ("n", "no", "f", "false", "off", "0")

    value = os.getenv(key)

    if value is None:
        return default

    value = value.strip().lower()

    if value in TRUTHY_STRINGS:
        return True
    elif value in FALSY_STRINGS:
        return False

    return default
