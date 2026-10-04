import importlib
import os
from unittest import mock

import pytest

from kolibri.utils.server import installation_type


@pytest.mark.parametrize(
    "windows, mac, env_value, reported",
    [
        (True, False, "windowsapp", "Windows App"),
        (False, True, "mac", "Mac"),
        (False, False, None, None),
    ],
)
def test_installation_type(windows, mac, env_value, reported):
    # kolibri_app sets environment variables when it is imported, so it is only
    # imported and reloaded inside a patched environment that is restored afterwards.
    with mock.patch.dict(os.environ, {"KOLIBRI_HOME": "/tmp/kolibri-app-test"}):
        app = importlib.import_module("kolibri_app")
        constants = importlib.import_module("kolibri_app.constants")
        os.environ.pop("KOLIBRI_INSTALLATION_TYPE", None)
        os.environ.pop("KOLIBRI_INSTALLER_VERSION", None)
        with (
            mock.patch.object(constants, "WINDOWS", windows),
            mock.patch.object(constants, "MAC", mac),
        ):
            importlib.reload(app)

        assert os.environ.get("KOLIBRI_INSTALLATION_TYPE") == env_value
        assert "KOLIBRI_INSTALLER_VERSION" not in os.environ
        if reported:
            assert installation_type() == reported
