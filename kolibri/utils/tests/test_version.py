"""
Tests for `kolibri` module.
"""
from __future__ import absolute_import, print_function, unicode_literals

import unittest
from functools import wraps

import kolibri
import mock
from kolibri.utils import version

#: Because we don't want to call the original (decorated function), it uses
#: caching and will return the result of the first call always. We call
#: the wrapped function `__wrapped__` directly.
get_version = version.get_version.__wrapped__  # @UndefinedVariable


def dont_call_me_maybe(msg):
    raise AssertionError(msg)


def mock_get_git_describe(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        # Simple mocking
        git_describe = version.get_git_describe
        version.get_git_describe = lambda *x: None
        try:
            ret_val = func(*args, **kwargs)
        finally:
            version.get_git_describe = git_describe
        return ret_val

    return wrapper


class TestKolibriVersion(unittest.TestCase):

    def test_version(self):
        """
        Test that the major version is set as expected
        """
        major_version_tuple = "{}.{}".format(*kolibri.VERSION[0:2])
        self.assertIn(major_version_tuple, kolibri.__version__)

    @mock_get_git_describe
    @mock.patch('kolibri.utils.version.get_version_file', return_value=None)
    def test_alpha_0_version(self, file_mock):
        """
        Test that when doing something with a 0th alpha doesn't provoke any
        hickups with ``git describe --tag``.
        """
        v = get_version((0, 1, 0, "alpha", 0))
        self.assertIn("0.1.0.dev", v)

    @mock_get_git_describe
    @mock.patch('kolibri.utils.version.get_version_file', return_value=None)
    def test_alpha_1_version(self, file_mock):
        """
        Test some normal alpha version, but don't assert that the
        ``git describe --tag`` is consistent (it will change in future test
        runs)
        """
        v = get_version((0, 1, 0, "alpha", 1))
        self.assertIn("0.1.0a1", v)

    @mock_get_git_describe
    def test_alpha_1_version_no_git(self):
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

    @mock_get_git_describe
    def test_alpha_1_version_file(self):
        """
        Test that a simple 0.1a1 works when loaded from a VERSION file
        """
        # Simple mocking
        get_version_file = version.get_version_file
        version.get_version_file = lambda: "0.1.0a1"
        try:
            v = get_version((0, 1, 0, "alpha", 1))
            self.assertIn("0.1.0a1", v)
        finally:
            version.get_version_file = get_version_file

    @mock_get_git_describe
    def test_version_file_linebreaks(self):
        """
        Test that line breaks don't get included in the final version

        See: https://github.com/learningequality/kolibri/issues/2464
        """
        # Simple mocking
        get_version_file = version.get_version_file
        version.get_version_file = lambda: "0.1.0a1\n"
        try:
            v = get_version((0, 1, 0, "alpha", 1))
            self.assertIn("0.1.0a1", v)
        finally:
            version.get_version_file = get_version_file

    @mock_get_git_describe
    def test_alpha_1_inconsistent_version_file(self):
        """
        Test that inconsistent file data also just fails
        """
        # Simple mocking
        get_version_file = version.get_version_file
        version.get_version_file = lambda: "0.2.0a1"
        try:
            self.assertRaises(
                AssertionError,
                get_version,
                (0, 1, 0, "alpha", 1)
            )
        finally:
            version.get_version_file = get_version_file

    @mock.patch('kolibri.utils.version.git_tagged_version', return_value=True)
    def test_alpha_1_inconsistent_git(self, tagged_mock):
        """
        Test that we fail when git returns inconsistent data
        """
        # Simple mocking
        git_describe = version.get_git_describe
        try:
            version.get_git_describe = lambda *x: 'v0.2.0-beta1'
            self.assertRaises(
                AssertionError,
                get_version,
                (0, 1, 0, "alpha", 1)
            )
            version.get_git_describe = lambda *x: 'v0.2.0-beta2'
            self.assertRaises(
                AssertionError,
                get_version,
                (0, 1, 0, "beta", 0)
            )
            version.get_git_describe = lambda *x: 'v0.1.0-beta2'
            self.assertRaises(
                AssertionError,
                get_version,
                (0, 1, 0, "beta", 1)
            )
            version.get_git_describe = lambda *x: 'v0.1.0'
            self.assertRaises(
                AssertionError,
                get_version,
                (0, 1, 0, "alpha", 0)
            )
        finally:
            version.get_git_describe = git_describe

    @mock.patch('kolibri.utils.version.git_tagged_version', return_value=True)
    @mock.patch('kolibri.utils.version.get_complete_version', side_effect=lambda x: x if x else (0, 2, 0, 'alpha', 2))
    @mock.patch('kolibri.utils.version.get_git_describe', return_value="v0.2.0-beta1")
    def test_beta_1_git(self, describe_mock, complete_mock, tagged_mock):
        """
        Test that we use git tag data when our version is alpha
        """
        self.assertEqual(
            get_version(),
            '0.2.0b1'
        )

    @mock_get_git_describe
    def test_final(self):
        """
        Test that the major version is set as expected on a final release
        """
        v = get_version((0, 1, 0, "final", 0))
        self.assertEqual(v, "0.1.0")

    def test_final_patch(self):
        """
        Test that the major version is set as expected on a final release
        """
        # Simple mocking
        git_describe = version.get_git_describe
        version.get_git_describe = lambda *x: dont_call_me_maybe("get_git_describe called")
        try:
            v = get_version((0, 1, 1, "final", 0))
            self.assertEqual(v, "0.1.1")
        finally:
            version.get_git_describe = git_describe

    def test_final_post(self):
        """
        Test that the major version is set as expected on a final release
        """
        # Simple mocking
        git_describe = version.get_git_describe
        version.get_git_describe = lambda *x: dont_call_me_maybe("get_git_describe called")
        try:
            v = get_version((0, 1, 1, "final", 1))
            self.assertEqual(v, "0.1.1.post1")
        finally:
            version.get_git_describe = git_describe
