"""
Tests for `kolibri.utils.cli` module.
These tests deliberately omit `@pytest.mark.django_db` from the tests,
so that any attempt to access the Django database during the running
of these cli methods will result in an error and test failure.
"""

import importlib
import sys
from unittest.mock import patch

from kolibri.utils import cli

# Patched inside each test, after kolibri is imported: env.set_env() prepends
# kolibri/dist to sys.path, so resolving Django earlier can bind a different copy.
DJANGO_CONNECT = "django.db.backends.base.base.BaseDatabaseWrapper.connect"


def test_stop_no_db_access():
    """
    Tests that stop does not try to access the database
    """
    with patch(DJANGO_CONNECT) as connect_mock:
        try:
            cli.stop.callback()
        except SystemExit:
            pass
    assert not connect_mock.called


@patch("kolibri.utils.conf.OPTIONS")
def test_import_no_options_evaluation(options_mock):
    # Reimporting rebinds kolibri.utils.cli; restore both it and sys.modules.
    with patch.dict(sys.modules), patch("kolibri.utils.cli", cli):
        # Evict the module-level import so the module body runs again.
        del sys.modules["kolibri.utils.cli"]
        importlib.import_module("kolibri.utils.cli")
    assert not options_mock.__getitem__.called
