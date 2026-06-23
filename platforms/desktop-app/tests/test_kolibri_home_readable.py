"""Tests for _kolibri_home_readable in view.py."""

import importlib
import logging
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock

# Mock modules that require a display, wx installation, or kolibri runtime.
# These must be set before importing kolibri_app.view.
_logger_mock = MagicMock()
_logger_mock.logging = logging.getLogger("test_kolibri_app")
sys.modules.setdefault("kolibri_app.logger", _logger_mock)
sys.modules.setdefault("wx", MagicMock())
sys.modules.setdefault("wx.html2", MagicMock())
# Mock only the leaf submodule view.py imports; mocking the top-level "django"
# package triggers pytest-django's setup path and causes collection errors.
sys.modules.setdefault("django.utils.translation.trans_real", MagicMock())

view = importlib.import_module("kolibri_app.view")


class TestKolibriHomeReadable(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("KOLIBRI_HOME", None)

    def test_returns_false_when_kolibri_home_not_set(self):
        os.environ.pop("KOLIBRI_HOME", None)
        self.assertFalse(view._kolibri_home_readable())

    def test_returns_true_for_readable_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["KOLIBRI_HOME"] = tmp
            self.assertTrue(view._kolibri_home_readable())

    def test_returns_false_for_nonexistent_path(self):
        os.environ["KOLIBRI_HOME"] = "/nonexistent/path/kolibri_home_test"
        self.assertFalse(view._kolibri_home_readable())

    @unittest.skipUnless(
        hasattr(os, "getuid") and os.getuid() != 0,
        "requires Unix and non-root",
    )
    def test_returns_false_for_unreadable_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.chmod(tmp, 0o000)
            os.environ["KOLIBRI_HOME"] = tmp
            try:
                self.assertFalse(view._kolibri_home_readable())
            finally:
                os.chmod(tmp, 0o700)
