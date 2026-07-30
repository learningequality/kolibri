# /// script
# requires-python = ">=3.6"
# dependencies = []
# ///
"""Print the Kolibri version from ``kolibri/_version.py`` -- the setuptools-scm
source of truth -- given a directory holding the ``kolibri`` package or a ``.whl``.

Stdlib-only, so callers can run it under a bare ``python3``.
"""

import os
import sys
import zipfile

VERSION_MODULE = "kolibri/_version.py"


def read_version(path):
    if path.endswith(".whl"):
        with zipfile.ZipFile(path) as wheel:
            source = wheel.read(VERSION_MODULE)
    else:
        with open(os.path.join(path, VERSION_MODULE), "rb") as version_module:
            source = version_module.read()
    # _version.py only assigns, so exec matches import -- impossible for a wheel member.
    namespace = {}
    exec(source, namespace)
    return namespace["__version__"]


if __name__ == "__main__":
    sys.stdout.write(read_version(sys.argv[1]) + "\n")
