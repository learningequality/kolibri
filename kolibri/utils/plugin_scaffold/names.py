"""
Pure name derivation for the plugin scaffolder.

Turns a readable plugin name ("My Thing") into every identifier the
templates need. No I/O.
"""

import re
from collections import namedtuple

PluginNames = namedtuple(
    "PluginNames",
    [
        "readable",
        "snake",
        "pascal",
        "class_name",
        "package_dir",
        "package_module",
        "module_dir",
        "translator_namespace",
    ],
)


def derive_names(readable_name):
    """
    Derive all plugin identifiers from a readable name.

    :param readable_name: e.g. "My Thing"
    :returns: a :class:`PluginNames` namedtuple.
    :raises ValueError: if the name yields no word characters.
    """
    words = [w.lower() for w in re.findall(r"[A-Za-z0-9]+", readable_name)]
    if not words:
        raise ValueError("Plugin name must contain at least one letter or digit")

    snake = "_".join(words)
    kebab = "-".join(words)
    pascal = "".join(w.capitalize() for w in words)

    return PluginNames(
        readable=readable_name.strip(),
        snake=snake,
        pascal=pascal,
        class_name=f"{pascal}Plugin",
        package_dir=f"kolibri-{kebab}-plugin",
        package_module=f"kolibri_{snake}_plugin",
        module_dir=snake,
        translator_namespace=f"{pascal}Strings",
    )
