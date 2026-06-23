"""Tests for _kolibri_home_readable helper in view.py."""

import logging
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock

# Mock all modules that require a display, wx installation, or kolibri runtime.
# These must be set before importing kolibri_app.view.
_logger_mock = MagicMock()
_logger_mock.logging = logging.getLogger("test_kolibri_app")
sys.modules.setdefault("kolibri_app.logger", _logger_mock)
sys.modules.setdefault("wx", MagicMock())
sys.modules.setdefault("wx.html2", MagicMock())
sys.modules.setdefault("django", MagicMock())
sys.modules.setdefault("django.utils", MagicMock())
sys.modules.setdefault("django.utils.translation", MagicMock())
sys.modules.setdefault("django.utils.translation.trans_real", MagicMock())

from kolibri_app import view  # noqa: E402


class TestKolibriHomeReadable(unittest.TestCase):
    def _remove_kolibri_home(self):
        os.environ.pop("KOLIBRI_HOME", None)

    def test_returns_false_when_kolibri_home_not_set(self):
        self._remove_kolibri_home()
        self.assertFalse(view._kolibri_home_readable())

    def test_returns_true_for_readable_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["KOLIBRI_HOME"] = tmp
            try:
                result = view._kolibri_home_readable()
            finally:
                self._remove_kolibri_home()
        self.assertTrue(result)

    def test_returns_false_for_nonexistent_path(self):
        os.environ["KOLIBRI_HOME"] = "/nonexistent/path/kolibri_home_test"
        try:
            result = view._kolibri_home_readable()
        finally:
            self._remove_kolibri_home()
        self.assertFalse(result)
