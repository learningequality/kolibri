from __future__ import annotations

import os
import typing


_APP_MODULES_LIST = [
    "kolibri",
    "kolibri_app_desktop_xdg_plugin",
]


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


def get_app_modules_debug_info() -> dict:
    debug_info = {}

    for module_name in _APP_MODULES_LIST:
        debug_info[module_name] = _get_module_debug_info(module_name)

    return debug_info


def _get_module_debug_info(module_name: str) -> typing.Optional[dict]:
    from importlib.metadata import PackageNotFoundError
    from importlib.util import find_spec
    from importlib.metadata import version

    module_spec = find_spec(module_name)

    if module_spec is None:
        return None

    try:
        return {
            "version": version(module_name),
            "origin": module_spec.origin,
        }
    except PackageNotFoundError:
        return None
