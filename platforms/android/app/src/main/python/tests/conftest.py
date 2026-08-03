import os
import sys
import types
from unittest.mock import MagicMock

# Ensure the python source dir is importable so `import taskworker`,
# `import task_reconciler`, and `import android_app_plugin.kolibri_plugin`
# resolve when tests run from the repo root.
_SOURCE_DIR = os.path.dirname(os.path.dirname(__file__))
if _SOURCE_DIR not in sys.path:
    sys.path.insert(0, _SOURCE_DIR)


def _install_fake_module(name, **attrs):
    if name in sys.modules:
        return
    module = types.ModuleType(name)
    for attr, value in attrs.items():
        setattr(module, attr, value)
    sys.modules[name] = module


# The Chaquopy Java bridge is the single hard boundary (the Android/Java
# runtime). It does not exist off-device, so stub it. Everything else,
# including first-party modules like auth, imports for real against these.
_install_fake_module("java", jclass=MagicMock(return_value=MagicMock()))
_install_fake_module("java.util", Locale=MagicMock())
# main imports our own Java classes through the same bridge; the parent
# packages have to exist for the `from ... import` to resolve.
_install_fake_module("org")
_install_fake_module("org.learningequality")
_install_fake_module(
    "org.learningequality.Kolibri", KolibriServerViewModel=MagicMock()
)
