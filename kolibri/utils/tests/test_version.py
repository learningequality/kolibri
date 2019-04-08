"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import unittest

import mock

import kolibri
from kolibri.utils import version

#: Because we don't want to call the original (decorated function), it uses
#: caching and will return the result of the first call always. We call
#: the wrapped function `__wrapped__` directly.
get_version = version.get_version.__wrapped__  # @UndefinedVariable


def dont_call_me_maybe(msg):
    raise AssertionError(msg)


class TestKolibriVersion(unittest.TestCase):
    def test_version(self):
        """
        Test that the major version is set as expected
        """
        major_version_tuple = "{}.{}".format(*kolibri.VERSION[0:2])
        self.assertIn(major_version_tuple, kolibri.__version__)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_alpha_0_version(self, file_mock, describe_mock):
        """
        Test that when doing something with a 0th alpha doesn't provoke any
        hickups with ``git describe --tag``.
        """
        v = get_version((0, 1, 0, "alpha", 0))
        self.assertIn("0.1.0.dev0", v)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_alpha_1_version(self, file_mock, describe_mock):
        """
        Test some normal alpha version, but don't assert that the
        ``git describe --tag`` is consistent (it will change in future test
        runs)
        """
        v = get_version((0, 1, 0, "alpha", 1))
        self.assertIn("0.1.0a1", v)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_alpha_1_version_no_git(self, describe_mock):
        """
        Not running from git and no VERSION file.
        """
        # Simple mocking
        get_version_file = version.get_version_file
        version.get_version_file = lambda: None
        try:
            v = get_version((0, 1, 0, "alpha", 1))
            self.assertIn("0.1.0a1", v)
        finally:
            version.get_version_file = get_version_file

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_alpha_1_version_file(self, describe_mock, file_mock):
        """
        Test that a simple 0.1a1 works when loaded from a VERSION file
        """
        v = get_version((0, 1, 0, "alpha", 1))
        self.assertIn("0.1.0a1", v)

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a1\n")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_version_file_linebreaks(self, describe_mock, file_mock):
        """
        Test that line breaks don't get included in the final version

        See: https://github.com/learningequality/kolibri/issues/2464
        """
        v = get_version((0, 1, 0, "alpha", 1))
        self.assertIn("0.1.0a1", v)

    @mock.patch(
        "kolibri.utils.version.get_version_file",
        return_value="0.7.1b1.dev0+git.2.gfd48a7a",
    )
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_version_file_local_git_version(self, describe_mock, file_mock):
        """
        Test that a version file with git describe output is correctly parsed
        """
        v = get_version((0, 7, 1, "beta", 1))
        self.assertIn("0.7.1b1.dev0+git.2.gfd48a7a", v)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_alpha_0_inconsistent_version_file(
        self, get_git_changeset_mock, describe_mock
    ):
        """
        Test that inconsistent file data also just fails
        """
        # Simple mocking
        get_version_file = version.get_version_file
        inconsistent_versions = ("0.2.0a1", "0.1.1a1", "0.1.0")
        for v in inconsistent_versions:
            version.get_version_file = lambda: v
            try:
                self.assertRaises(AssertionError, get_version, (0, 1, 0, "alpha", 0))
            finally:
                version.get_version_file = get_version_file

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_alpha_1_inconsistent_version_file(
        self, get_git_changeset_mock, describe_mock
    ):
        """
        Test that inconsistent file data also just fails
        """
        # Simple mocking
        get_version_file = version.get_version_file
        inconsistent_versions = ("0.2.0a1", "0.1.1a1", "0.1.0")
        for v in inconsistent_versions:
            version.get_version_file = lambda: v
            try:
                self.assertRaises(AssertionError, get_version, (0, 1, 0, "alpha", 1))
            finally:
                version.get_version_file = get_version_file

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0b1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_alpha_0_consistent_version_file(
        self, get_git_changeset_mock, describe_mock, file_mock
    ):
        """
        Test that a VERSION file can overwrite an alpha-0 (dev) state.
        Because a prerelease can be made with a version file.
        """
        assert get_version((0, 1, 0, "alpha", 0)) == "0.1.0b1"

    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch(
        "kolibri.utils.version.get_git_describe",
        return_value="v0.1.0-alpha1-123-abcdfe12",
    )
    def test_alpha_0_consistent_git(self, describe_mock, file_mock):
        """
        Tests that git describe data for an alpha-1 tag generates an a1 version
        string.
        """
        assert get_version((0, 1, 0, "alpha", 0)) == "0.1.0a1.dev0+git.123.abcdfe12"

    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch(
        "kolibri.utils.version.get_git_describe",
        return_value="v0.1.0-alpha1-123-abcdfe12",
    )
    def test_alpha_1_consistent_git(self, describe_mock, file_mock):
        """
        Tests that git describe data for an alpha-1 tag generates an a1 version
        string.
        """
        assert get_version((0, 1, 0, "alpha", 1)) == "0.1.0a1.dev0+git.123.abcdfe12"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0b2")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_beta_1_consistent_version_file(
        self, get_git_changeset_mock, describe_mock, file_mock
    ):
        """
        Test that a VERSION file can overwrite an beta-1 state in case the
        version was bumped in ``kolibri.VERSION``.
        """
        assert get_version((0, 1, 0, "beta", 1)) == "0.1.0b2"

    @mock.patch(
        "kolibri.utils.version.get_version_file",
        return_value="0.7.1b1.dev0+git.12.g2a8fe31",
    )
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_beta_1_consistent_dev_release_version_file(
        self, get_git_changeset_mock, describe_mock, file_mock
    ):
        """
        Test that a VERSION file can overwrite an beta-1 state in case the
        version was bumped in ``kolibri.VERSION``.
        """
        assert get_version((0, 7, 1, "alpha", 0)) == "0.7.1b1.dev0+git.12.g2a8fe31"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0b1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.0.1")
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value="+git123")
    def test_version_file_ignored(
        self, get_git_changeset_mock, describe_mock, file_mock
    ):
        """
        Test that the VERSION file is NOT used where git data is available
        """
        assert get_version((0, 1, 0, "alpha", 0)) == "0.1.0.dev0+git123"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_version_file_final(self, get_git_changeset_mock, describe_mock, file_mock):
        """
        Test that a VERSION specifying a final version will work when the
        kolibri.VERSION tuple is consistent.
        """
        assert get_version((0, 1, 0, "final", 0)) == "0.1.0"

    def test_alpha_1_inconsistent_git(self):
        """
        Test that we fail when git returns inconsistent data
        """
        # Simple mocking
        git_describe = version.get_git_describe
        try:
            version.get_git_describe = lambda *x: "v0.2.0-beta1"
            self.assertRaises(AssertionError, get_version, (0, 1, 0, "alpha", 1))
            version.get_git_describe = lambda *x: "v0.2.0-beta2"
            self.assertRaises(AssertionError, get_version, (0, 1, 0, "beta", 0))
            version.get_git_describe = lambda *x: "v0.1.0"
            self.assertRaises(AssertionError, get_version, (0, 1, 0, "alpha", 0))
        finally:
            version.get_git_describe = git_describe

    @mock.patch(
        "kolibri.utils.version.get_git_describe",
        return_value="v0.1.0-beta1-123-abcdfe12",
    )
    def test_alpha_1_beta_1_consistent_git(self, describe_mock):
        """
        Test that a beta1 git tag can override kolibri.__version__ reading
        alpha0.
        """
        assert get_version((0, 1, 0, "alpha", 1)) == "0.1.0b1.dev0+git.123.abcdfe12"

    @mock.patch("subprocess.Popen")
    def test_git_describe_parser(self, popen_mock):
        """
        Test that we get the git describe data when it's there
        """
        process_mock = mock.Mock()
        attrs = {"communicate.return_value": ("v0.1.0-beta1-123-abcdfe12", "")}
        process_mock.configure_mock(**attrs)
        popen_mock.return_value = process_mock
        assert get_version((0, 1, 0, "alpha", 1)) == "0.1.0b1.dev0+git.123.abcdfe12"

    @mock.patch("subprocess.Popen")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_git_random_tag(self, file_mock, popen_mock):
        """
        Test that we don't fail if some random tag appears
        """
        process_mock = mock.Mock()
        attrs = {"communicate.return_value": ("foobar", "")}
        process_mock.configure_mock(**attrs)
        popen_mock.return_value = process_mock
        assert get_version((0, 1, 0, "alpha", 1)) == "0.1.0a1"

    @mock.patch("subprocess.Popen", side_effect=EnvironmentError())
    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a2")
    def test_prerelease_no_git(self, file_mock, popen_mock):
        """
        Test that we don't fail and that the version file is used
        """
        assert get_version((0, 1, 0, "alpha", 1)) == "0.1.0a2"

    @mock.patch(
        "kolibri.utils.version.get_complete_version",
        side_effect=lambda x: x if x else (0, 2, 0, "alpha", 2),
    )
    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.2.0-beta1")
    def test_beta_1_git(self, describe_mock, complete_mock):
        """
        Test that we use git tag data when our version is alpha
        """
        self.assertEqual(get_version(), "0.2.0b1")

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_final(self, describe_mock):
        """
        Test that the major version is set as expected on a final release
        """
        v = get_version((0, 1, 0, "final", 0))
        self.assertEqual(v, "0.1.0")
        assert describe_mock.call_count == 0

    @mock.patch("kolibri.utils.version.get_git_describe")
    def test_final_patch(self, describe_mock):
        """
        Test that the major version is set as expected on a final release
        """
        v = get_version((0, 1, 1, "final", 0))
        self.assertEqual(v, "0.1.1")
        assert describe_mock.call_count == 0

    @mock.patch("kolibri.utils.version.get_git_describe")
    def test_final_post(self, describe_mock):
        """
        Test that the major version is set as expected on a final release
        """
        v = get_version((0, 1, 1, "final", 1))
        self.assertEqual(v, "0.1.1.post1")
        assert describe_mock.call_count == 0

    def test_version_compat(self):
        """
        Test that our version glue works for some really old releases of
        setuptools, like the one in Ubuntu 14.04.

        We don't have a reference implementation, but parse_version will return
        a tuple, and this is from a live system::

            test@test-VirtualBox:~$ python
            Python 2.7.6 (default, Jun 22 2015, 17:58:13)
            [GCC 4.8.2] on linux2
            Type "help", "copyright", "credits" or "license" for more information.
            >>> from pkg_resources import parse_version
            >>> parse_version("1.2.3")
            ('00000001', '00000002', '00000003', '*final')
            >>> parse_version("1.2.3.dev0")
            ('00000001', '00000002', '00000003', '*@', '*final')
            >>> parse_version("1.2.3a1")
            ('00000001', '00000002', '00000003', '*a', '00000001', '*final')
            >>> parse_version("1.2.3a0")
            ('00000001', '00000002', '00000003', '*a', '*final')
            >>> parse_version("1.2.3b1")
            ('00000001', '00000002', '00000003', '*b', '00000001', '*final')
            >>> parse_version("1.2.3b1+git.123")
            ('00000001', '00000002', '00000003', '*b', '00000001', '*+', '*git', '*final-', '00000123', '*final')

        """
        from kolibri.utils.compat import VersionCompat

        assert (
            VersionCompat(("00000001", "00000002", "00000003", "*final")).base_version
            == "1.2.3"
        )

        assert (
            VersionCompat(
                ("00000001", "00000002", "00000003", "*@", "*final")
            ).base_version
            == "1.2.3"
        )

        assert (
            VersionCompat(
                ("00000001", "00000002", "00000003", "*a", "00000001", "*final")
            ).base_version
            == "1.2.3"
        )

        assert (
            VersionCompat(
                ("00000001", "00000002", "00000003", "*b", "00000001", "*final")
            ).base_version
            == "1.2.3"
        )

        assert (
            VersionCompat(
                (
                    "00000001",
                    "00000002",
                    "00000003",
                    "*b",
                    "00000001",
                    "*+",
                    "*git",
                    "*final-",
                    "00000123",
                    "*final",
                )
            ).base_version
            == "1.2.3"
        )

        assert (
            VersionCompat(
                (
                    "00000000",
                    "00000002",
                    "00000003",
                    "*b",
                    "00000001",
                    "*+",
                    "*git",
                    "*final-",
                    "00000123",
                    "*final",
                )
            ).base_version
            == "0.2.3"
        )
