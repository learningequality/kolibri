import pwd
import unittest
from unittest import mock

from kolibri.core.device.login_tokens import OSUserInfo
from kolibri_app import server_manager_posix


class TestCurrentOSUser(unittest.TestCase):
    def _current_os_user(self, getpwnam):
        with (
            mock.patch.object(
                server_manager_posix.getpass, "getuser", return_value="jane"
            ),
            mock.patch.object(server_manager_posix.pwd, "getpwnam", getpwnam),
        ):
            return server_manager_posix.current_os_user()

    def test_full_name_is_the_first_gecos_field(self):
        entry = pwd.struct_passwd(
            ("jane", "x", 1000, 1000, "Jane Doe,,,", "/home/jane", "/bin/bash")
        )
        self.assertEqual(
            self._current_os_user(lambda name: entry),
            OSUserInfo("jane", "jane", "Jane Doe", True),
        )

    def test_user_missing_from_passwd_has_empty_full_name(self):
        self.assertEqual(
            self._current_os_user(mock.Mock(side_effect=KeyError("jane"))),
            OSUserInfo("jane", "jane", "", True),
        )
