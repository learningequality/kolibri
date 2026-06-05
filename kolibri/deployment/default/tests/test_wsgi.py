"""
Initialization tests for the WSGI entrypoints in this deployment.

uWSGI loads these modules in a fresh interpreter that has *not* run
``django.setup()`` -- see kolibri-server's ``uwsgi.ini`` and ``hashi_uwsgi.ini``,
which point at ``wsgi:application`` and ``alt_wsgi:alt_application``. Importing
the module must therefore not touch the ORM at import time: if it does, the
worker crashes at load with ``AppRegistryNotReady: Apps aren't loaded yet.`` and
no app is served (``*** no app loaded. GAME OVER ***``).

Each test reproduces that fresh-interpreter load in a subprocess, so the suite
catches any model-touching import that creeps back into the module top level
(for example a transitive ``NetworkClient`` import pulling in
``kolibri.core.discovery.models``).
"""

import os
import subprocess
import sys

import pytest

# (importable module path, attribute that must hold the WSGI application)
WSGI_ENTRYPOINTS = [
    ("kolibri.deployment.default.wsgi", "application"),
    ("kolibri.deployment.default.alt_wsgi", "alt_application"),
]


@pytest.mark.parametrize("module_path,app_attribute", WSGI_ENTRYPOINTS)
def test_wsgi_entrypoint_imports_without_django_setup(module_path, app_attribute):
    """
    Importing the entrypoint in a clean interpreter (as uWSGI does) must succeed
    and expose its application callable, without a prior ``django.setup()``.
    """
    code = (
        f"import {module_path}; "
        f"app = getattr({module_path}, {app_attribute!r}); "
        "assert app is not None"
    )

    env = os.environ.copy()
    env.setdefault("DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base")

    result = subprocess.run(
        [sys.executable, "-c", code],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        timeout=120,
    )

    assert result.returncode == 0, (
        f"Importing {module_path} in a fresh interpreter (as uWSGI does) failed. "
        "The module likely touches the ORM at import time, before django.setup() "
        f"has run:\n\n{result.stdout}"
    )
