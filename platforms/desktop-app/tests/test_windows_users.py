import importlib
import sys
import unittest
from unittest import mock

from kolibri.core.device.login_tokens import OSUserInfo


class Win32Error(Exception):
    pass


_windows_modules = {
    "pywintypes": mock.MagicMock(error=Win32Error),
    "win32api": mock.MagicMock(),
    "win32net": mock.MagicMock(),
    "win32security": mock.MagicMock(),
}

sys.modules.update(_windows_modules)
try:
    windows_users = importlib.import_module("kolibri_app.windows_users")
finally:
    for _name in _windows_modules:
        del sys.modules[_name]


class TestPipeClientUserInfo(unittest.TestCase):
    def setUp(self):
        self.win32api = self._patch("win32api")
        self.win32api.GetComputerName.return_value = "DESKTOP"
        self.win32security = self._patch("win32security")
        self.win32security.GetTokenInformation.side_effect = lambda _token, info_class: (
            ("sid", 0)
            if info_class == self.win32security.TokenUser
            else [(windows_users._ADMINISTRATORS_SID, 0)]
        )
        self.win32net = self._patch("win32net")
        self.win32net.NetGetAnyDCName.side_effect = lambda _server, domain: (
            f"\\\\{domain}-DC"
        )
        self.win32net.NetUserGetInfo.side_effect = lambda server, account, level: {
            "full_name": f"{account} on {server}"
        }

    def _patch(self, name):
        patcher = mock.patch.object(windows_users, name)
        self.addCleanup(patcher.stop)
        return patcher.start()

    def _sign_in_as(self, account, domain):
        self.win32security.LookupAccountSid.return_value = (account, domain, 1)
        return windows_users.pipe_client_user_info("pipe")

    def test_domain_account_is_qualified_and_named_by_its_domain(self):
        self.assertEqual(
            self._sign_in_as("jane", "CORP"),
            OSUserInfo("CORP\\jane", "jane", "jane on \\\\CORP-DC", True),
        )

    def test_local_account_is_bare_and_named_by_this_computer(self):
        self.assertEqual(
            self._sign_in_as("jane", "desktop"),
            OSUserInfo("jane", "jane", "jane on None", True),
        )

    def test_full_name_lookup_failure_gives_empty_full_name(self):
        self.win32net.NetGetAnyDCName.side_effect = Win32Error
        self.assertEqual(self._sign_in_as("jane", "CORP").full_name, "")
