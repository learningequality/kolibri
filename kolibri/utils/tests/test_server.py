"""
Tests for `kolibri.utils.server` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from unittest import TestCase

from mock import patch

from kolibri.utils import server


class TestServerInstallation(TestCase):
    @patch("sys.argv", ["kolibri-0.9.3.pex", "start"])
    def test_pex(self):
        install_type = server.installation_type()
        assert install_type == "pex"

    def test_dev(self):
        sys_args = [
            "kolibri",
            "--debug",
            "manage",
            "runserver",
            "--settings=kolibri.deployment.default.settings.dev",
            '"0.0.0.0:8000"',
        ]
        with patch("sys.argv", sys_args):
            install_type = server.installation_type()
            assert install_type == "devserver"

    @patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_dpkg(self):
        with patch("kolibri.utils.server.check_output", return_value=""):
            install_type = server.installation_type()
            assert install_type == "dpkg"

    @patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_apt(apt):
        with patch("kolibri.utils.server.check_output", return_value="any repo"):
            install_type = server.installation_type()
            assert install_type == "apt"

    @patch("sys.argv", ["C:\\Python34\\Scripts\\kolibri", "start"])
    @patch("sys.path", ["", "C:\\Program Files\\Kolibri\\kolibri.exe"])
    def test_windows(self):
        install_type = server.installation_type()
        assert install_type == "Windows"

    @patch("sys.argv", ["/usr/local/bin/kolibri", "start"])
    def test_whl(self):
        install_type = server.installation_type()
        assert install_type == "whl"
