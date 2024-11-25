"""
Tests for `kolibri` module.
"""
import unittest

import mock
from parameterized import parameterized

import kolibri
from kolibri.utils import version

#: Because we don't want to call the original (decorated function), it uses
#: caching and will return the result of the first call always. We call
#: the wrapped function `__wrapped__` directly.
get_version = version.get_version.__wrapped__  # @UndefinedVariable


def _sanitize(name):
    name = name.replace(" ", "_")
    name = name.replace(">=", "gte")
    name = name.replace(">", "gt")
    name = name.replace("<=", "lte")
    name = name.replace("<", "lt")
    name = name.replace("==", "eq")
    name = name.replace("!=", "ne")
    name = name.replace(".", "_")
    name = name.replace("+", "_")
    name = name.replace("-", "_")
    name = name.replace(",", "_")
    return name


def _name_func(test_func, param_num, params):
    return f"{test_func.__name__}_{param_num}_{_sanitize(params.args[0])}_{_sanitize(params.args[1])}_{params.args[2]}"


class TestKolibriVersion(unittest.TestCase):
    def test_version(self):
        """
        Test that the major version is set as expected
        """
        major_version_tuple = "{}.{}".format(*kolibri.VERSION[0:2])
        self.assertIn(major_version_tuple, kolibri.__version__)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_no_tag_no_file_version_no_git_changeset(
        self, get_git_changeset_mock, file_mock, describe_mock
    ):
        """
        Test that when doing something with a 0th alpha doesn't provoke any
        hiccups with ``git describe --tag``.
        If the version file returns nothing, and get_git_describe returns nothing,
        and get_git_changeset returns nothing,
        then get_prerelease_version should return x.y.z.dev0
        as we are not on a final release, but we can't determine any more information
        beyond that, so we can only say this is a dev0 release and nothing more.
        """
        v = get_version((0, 1, 0))
        self.assertEqual("0.1.0.dev0", v)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch(
        "kolibri.utils.version.get_git_changeset", return_value="+git.1234567890"
    )
    def test_no_tag_no_file_version_git_changeset(
        self, get_git_changeset_mock, file_mock, describe_mock
    ):
        """
        Test that when doing something with a 0th alpha doesn't provoke any
        hiccups with ``git describe --tag``.
        If the version file returns nothing, and get_git_describe returns nothing,
        then get_prerelease_version should return x.y.z.dev0 and the output of
        get_git_changeset to give an incrementing version number in absence of any
        other relevant tag information.
        """
        v = get_version((0, 1, 0))
        self.assertEqual("0.1.0.dev0+git.1234567890", v)

    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.1.0-alpha1")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_alpha_1_version(self, file_mock, describe_mock):
        """
        Test some normal alpha version, but don't assert that the
        ``git describe --tag`` is consistent (it will change in future test
        runs)
        """
        v = get_version((0, 1, 0))
        self.assertIn("0.1.0a1", v)

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_alpha_1_version_file(self, describe_mock, file_mock):
        """
        Test that a simple 0.1a1 works when loaded from a VERSION file
        If the version file returns a version that matches the
        major, minor, patch of the version tuple, return that version string
        """
        v = get_version((0, 1, 0))
        self.assertIn("0.1.0a1", v)

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a1\n")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_version_file_linebreaks(self, describe_mock, file_mock):
        """
        Test that line breaks don't get included in the final version

        See: https://github.com/learningequality/kolibri/issues/2464
        """
        v = get_version((0, 1, 0))
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
        v = get_version((0, 7, 1))
        self.assertIn("0.7.1b1.dev0+git.2.gfd48a7a", v)

    @mock.patch(
        "kolibri.utils.version.get_version_file",
        return_value="0.7.1rc1.dev0+git.2.gfd48a7a",
    )
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    def test_version_file_local_git_version_rc(self, describe_mock, file_mock):
        """
        Test that a version file with git describe output is correctly parsed
        """
        v = get_version((0, 7, 1))
        self.assertIn("0.7.1rc1.dev0+git.2.gfd48a7a", v)

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a1\n")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_alpha_0_inconsistent_version_file(
        self, get_git_changeset_mock, describe_mock, version_file_mock
    ):
        """
        Test that inconsistent version file data also just fails
        If the version file returns a version that doesn't match the
        major, minor, patch of the version tuple, throw an assertion error
        """
        inconsistent_versions = ("0.2.0a1", "0.1.1a1")
        for v in inconsistent_versions:
            version_file_mock.return_value = v
            self.assertRaises(AssertionError, get_version, (0, 1, 0))

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
        assert get_version((0, 1, 0)) == "0.1.0b1"

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
        assert get_version((0, 1, 0)) == "0.1.0a1.dev0+git.123.abcdfe12"

    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch(
        "kolibri.utils.version.get_git_describe",
        return_value="v0.1.0-alpha1",
    )
    def test_alpha_1_consistent_git_tag(self, describe_mock, file_mock):
        """
        Tests that git describe data for an alpha-1 tag generates an a1 version
        string.
        If the version file returns nothing, and get_git_describe returns a version
        tag like v0.1.0-alpha1 and it matches the major, minor, patch of the version tuple,
        return the version (without the v) (because that means we are on a tagged commit)
        """
        assert get_version((0, 1, 0)) == "0.1.0a1"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0b1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.0.1")
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value="+git123")
    def test_version_file_overrides(
        self, get_git_changeset_mock, describe_mock, file_mock
    ):
        """
        Test that the VERSION file is used when git data is available
        """
        assert get_version((0, 1, 0)) == "0.1.0b1"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0rc1")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_version_file_rc(self, get_git_changeset_mock, describe_mock, file_mock):
        """
        Test that a VERSION specifying a final version will work when the
        kolibri.VERSION tuple is consistent.
        """
        assert get_version((0, 1, 0)) == "0.1.0rc1"

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0")
    @mock.patch("kolibri.utils.version.get_git_describe", return_value=None)
    @mock.patch("kolibri.utils.version.get_git_changeset", return_value=None)
    def test_version_file_final(self, get_git_changeset_mock, describe_mock, file_mock):
        """
        Test that a VERSION specifying a final version will work when the
        kolibri.VERSION tuple is consistent.
        """
        assert get_version((0, 1, 0)) == "0.1.0"

    @mock.patch(
        "kolibri.utils.version.get_version_file",
        return_value=None,
    )
    @mock.patch("kolibri.utils.version.get_git_describe")
    def test_alpha_1_inconsistent_git_tag(self, describe_mock, file_mock):
        """
        Test that we fail when git returns inconsistent data
        Only when the returned tag is a greater major, minor, patch
        version than what we have encoded in the version tuple.
        This should ensure that we notice if we apply a tag on the wrong
        repository branch.
        """
        describe_mock.return_value = "v0.2.0-beta1"
        self.assertRaises(AssertionError, get_version, (0, 1, 0))
        describe_mock.return_value = "v0.2.0"
        self.assertRaises(AssertionError, get_version, (0, 1, 0))

    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    @mock.patch(
        "kolibri.utils.version.get_git_describe",
    )
    def test_alpha_1_inconsistent_git(self, describe_mock, file_mock):
        """
        Tests that git describe data for an alpha-1 tag generates an a1 version
        string.
        Only when the returned version is a greater major, minor, patch
        version than what we have encoded in the version tuple.
        """
        describe_mock.return_value = "v0.2.0-alpha1-123-abcdfe12"
        self.assertRaises(AssertionError, get_version, (0, 1, 0))

    @mock.patch("subprocess.Popen")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_git_describe_parser(self, file_mock, popen_mock):
        """
        Test that we get the git describe data when it's there
        """
        process_mock = mock.Mock()
        attrs = {"communicate.return_value": ("v0.1.0-beta1-123-abcdfe12", "")}
        process_mock.configure_mock(**attrs)
        popen_mock.return_value = process_mock
        assert get_version((0, 1, 0)) == "0.1.0b1.dev0+git.123.abcdfe12"

    @mock.patch("subprocess.Popen")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_git_random_tag(self, file_mock, popen_mock):
        """
        Test that we don't fail if some random tag appears
        Always fallback to .dev0 to give some indication that
        this is not a final release, even if we can discern nothing else.
        Noting that the subprocess.Popen mock also causes get_git_changeset
        to return nothing meaningful either, so we don't even get that additional information.
        """
        process_mock = mock.Mock()
        attrs = {"communicate.return_value": ("foobar", "")}
        process_mock.configure_mock(**attrs)
        popen_mock.return_value = process_mock
        assert get_version((0, 1, 0)) == "0.1.0.dev0"

    @mock.patch("subprocess.Popen", side_effect=EnvironmentError())
    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.0a2")
    def test_prerelease_no_git(self, file_mock, popen_mock):
        """
        Test that we don't fail and that the version file is used
        """
        assert get_version((0, 1, 0)) == "0.1.0a2"

    @mock.patch("kolibri.utils.version.get_git_describe")
    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.1.1")
    def test_final_patch(self, file_mock, describe_mock):
        """
        Test that the major version is set as expected on a final release
        """
        v = get_version((0, 1, 1))
        self.assertEqual(v, "0.1.1")
        assert describe_mock.call_count == 0

    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.1.1")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_final_tag(self, file_mock, describe_mock):
        """
        Test that the major version is set as expected on a final release tag
        """
        v = get_version((0, 1, 1))
        self.assertEqual(v, "0.1.1")
        assert describe_mock.call_count == 1

    @mock.patch(
        "kolibri.utils.version.get_git_describe", return_value="v0.1.1-6-gdef09150"
    )
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_after_final_tag(self, file_mock, describe_mock):
        """
        Test that the version is set as the next patch alpha when we are beyond the final release tag
        """
        v = get_version((0, 1, 1))
        self.assertEqual(v, "0.1.1a0.dev0+git.6.gdef09150")
        assert describe_mock.call_count == 1

    def test_truncate_version(self):
        self.assertEqual(
            "0.15.0a5.dev0+git.682.g0be46de2",
            version.truncate_version(
                "0.15.0a5.dev0+git.682.g0be46de2",
                truncation_level=version.BUILD_VERSION,
            ),
        )
        self.assertEqual(
            "0.15.0a5",
            version.truncate_version(
                "0.15.0a5.dev0+git.682.g0be46de2",
                truncation_level=version.PRERELEASE_VERSION,
            ),
        )
        self.assertEqual(
            "0.15.0", version.truncate_version("0.15.0a5.dev0+git.682.g0be46de2")
        )
        self.assertEqual(
            "0.15.0",
            version.truncate_version("0.15.1", truncation_level=version.MINOR_VERSION),
        )
        self.assertEqual(
            "1.0.0",
            version.truncate_version("1.15.1", truncation_level=version.MAJOR_VERSION),
        )

    def test_normalize_version_to_semver_dev(self):
        self.assertEqual(
            version.normalize_version_to_semver(
                "0.15.0a5.dev0+git.682.g0be46de2",
            ),
            "0.15.0-a.5.dev0.git.682.g0be46de2",
        )

    def test_normalize_version_to_semver_tripartite(self):
        self.assertEqual(
            version.normalize_version_to_semver(
                "0.15.0",
            ),
            "0.15.0",
        )

    def test_normalize_version_to_semver_bipartite(self):
        self.assertEqual(
            version.normalize_version_to_semver(
                "1.10",
            ),
            "1.10",
        )

    def test_normalize_version_to_semver_alpa(self):
        self.assertEqual(
            version.normalize_version_to_semver(
                "0.14a1",
            ),
            "0.14-a.1",
        )

    def test_normalize_version_to_semver_beta(self):
        self.assertEqual(
            version.normalize_version_to_semver(
                "0.16b1",
            ),
            "0.16-b.1",
        )

    @mock.patch("kolibri.utils.version.get_git_describe", return_value="v0.15.8")
    @mock.patch("kolibri.utils.version.get_version_file", return_value=None)
    def test_get_version(self, file_mock, describe_mock):
        self.assertEqual(
            get_version((0, 15, 8)),
            "0.15.8",
        )
        assert describe_mock.call_count == 1

    @mock.patch("kolibri.utils.version.get_version_file", return_value="0.15.8")
    def test_get_version_from_file(self, describe_mock):
        self.assertEqual(
            get_version((0, 15, 8)),
            "0.15.8",
        )
        assert describe_mock.call_count == 1

    @parameterized.expand(
        [
            ("0.15.8", ">=0.15.8", True),
            ("0.15.7", ">=0.15.8", False),
            ("0.15.8a5", ">=0.15.8", False),
            ("0.15.9a5", ">=0.15.8", True),
            ("0.15.8a5.dev0+git.682.g0be46de2", ">=0.15.8", False),
            ("0.15.9a5.dev0+git.682.g0be46de2", ">=0.15.8", True),
            ("0.15.9", ">0.15.8", True),
            ("0.15.8", ">0.15.8", False),
            ("0.15.9a5.dev0+git.682.g0be46de2", ">0.15.8", True),
            ("0.15.8a5.dev0+git.682.g0be46de2", ">0.15.8", False),
            ("0.15.9a5", ">0.15.8", True),
            ("0.15.8a5", ">0.15.8", False),
            ("0.15.9b5", ">0.15.8", True),
            ("0.15.8b5", ">0.15.8", False),
            ("0.15.9rc5", ">0.15.8", True),
            ("0.15.8rc5", ">0.15.8", False),
            ("0.15.8", "<=0.15.8", True),
            ("0.15.9", "<=0.15.8", False),
            ("0.15.9a5.dev0+git.682.g0be46de2", "<=0.15.8", False),
            ("0.15.8a5.dev0+git.682.g0be46de2", "<=0.15.8", True),
            ("0.15.9a5", "<=0.15.8", False),
            ("0.15.8a5", "<=0.15.8", True),
            ("0.15.9b5", "<=0.15.8", False),
            ("0.15.8b5", "<=0.15.8", True),
            ("0.15.9rc5", "<=0.15.8", False),
            ("0.15.8rc5", "<=0.15.8", True),
            ("0.15.7", "<0.15.8", True),
            ("0.15.8", "<0.15.8", False),
            ("0.15.8a5.dev0+git.682.g0be46de2", "<0.15.8", True),
            ("0.15.9a5.dev0+git.682.g0be46de2", "<0.15.8", False),
            ("0.15.8a5", "<0.15.8", True),
            ("0.15.9a5", "<0.15.8", False),
            ("0.15.8b5", "<0.15.8", True),
            ("0.15.9b5", "<0.15.8", False),
            ("0.15.8rc5", "<0.15.8", True),
            ("0.15.9rc5", "<0.15.8", False),
            ("0.15.8", "==0.15.8", True),
            ("0.15.9", "==0.15.8", False),
            ("0.15.7", "!=0.15.8", True),
            ("0.15.8", "!=0.15.8", False),
        ],
        name_func=_name_func,
    )
    def test_version_matches_simple_range(self, version_string, version_range, matches):
        self.assertEqual(
            version.version_matches_range(version_string, version_range), matches
        )

    @parameterized.expand(
        [
            ("0.15.8", ">0.15.8,<0.16.0", False),
            ("0.15.7", ">0.15.8,<0.16.0", False),
            ("0.15.8a5.dev+git.682.g0be46de2", ">0.15.8,<0.16.0", False),
            ("0.15.9a5.dev+git.682.g0be46de2", ">0.15.8,<0.16.0", True),
            ("0.15.8a5", ">0.15.8,<0.16.0", False),
            ("0.15.9a5", ">0.15.8,<0.16.0", True),
            ("0.15.8b5", ">0.15.8,<0.16.0", False),
            ("0.15.9b5", ">0.15.8,<0.16.0", True),
            ("0.15.8rc5", ">0.15.8,<0.16.0", False),
            ("0.15.9rc5", ">0.15.8,<0.16.0", True),
            ("0.15.9", ">0.15.8,<0.16.0", True),
            ("0.16.0", ">0.15.8,<0.16.0", False),
            ("0.15.9", ">0.15.8,<0.16.0", True),
            ("0.15.8", ">=0.15.8,<0.16.0", True),
            ("0.15.7", ">=0.15.8,<0.16.0", False),
            ("0.16.0", ">=0.15.8,<0.16.0", False),
            ("0.16.0", ">=0.15.8,<=0.16.0", True),
            ("0.16.1", ">=0.15.8,<=0.16.0", False),
        ],
        name_func=_name_func,
    )
    def test_version_matches_compound_range(
        self, version_string, compound_range, matches
    ):
        self.assertEqual(
            version.version_matches_range(version_string, compound_range), matches
        )
