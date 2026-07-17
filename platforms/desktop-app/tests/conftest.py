import os
import sys
import types

# kolibri_app lives under src/ and the member isn't installed (package = false);
# put src/ on the path before collection so the tests can import it (matches
# platforms/debian-server's conftest, no pytest-pythonpath plugin needed).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# _version.py is generated at build time (Makefile `write-version`) and
# gitignored, so it is absent in a fresh checkout / the test row. kolibri_app
# imports __version__ from it at import time; stub a real module here, before
# the test module is collected, so the import resolves without a build.
_version = types.ModuleType("kolibri_app._version")
_version.__version__ = _version.version = "0.0.0"
sys.modules.setdefault("kolibri_app._version", _version)
