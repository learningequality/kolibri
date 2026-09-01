import logging
import os
import sys
import types
from unittest.mock import MagicMock

# kolibri_app lives under src/ and the member isn't installed (package = false);
# put src/ on the path before collection so the tests can import it (matches
# platforms/debian-server's conftest, no pytest-pythonpath plugin needed).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# The installer build scripts sit outside any package and import each other by
# bare name, the way the Makefile runs them.
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "installer", "translations")
)

# _version.py is generated at build time (Makefile `write-version`) and
# gitignored, so it is absent in a fresh checkout / the test row. kolibri_app
# imports __version__ from it at import time; stub a real module here, before
# the test module is collected, so the import resolves without a build.
_version = types.ModuleType("kolibri_app._version")
_version.__version__ = _version.version = "0.0.0"
sys.modules.setdefault("kolibri_app._version", _version)

# Stand in for the modules that need a display or the kolibri runtime.
_logger_mock = MagicMock()
_logger_mock.logging = logging.getLogger("test_kolibri_app")
sys.modules.setdefault("kolibri_app.logger", _logger_mock)
sys.modules.setdefault("wx", MagicMock())
sys.modules.setdefault("wx.adv", MagicMock())
# Mock only the leaf submodule view.py imports; mocking the top-level "django"
# package triggers pytest-django's setup path and causes collection errors.
sys.modules.setdefault("django.utils.translation.trans_real", MagicMock())
