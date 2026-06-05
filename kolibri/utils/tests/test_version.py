"""
Tests for `kolibri` module.
"""

import unittest

from parameterized import parameterized
from setuptools_scm import Configuration
from setuptools_scm.git import _git_parse_describe
from setuptools_scm.version import format_version
from setuptools_scm.version import meta

import kolibri
from kolibri.utils import version

#: setuptools-scm configuration matching pyproject.toml
_scm_config = Configuration(root=".")


def _scm_version(describe_output):
    """Format a version from raw git describe output using our setuptools-scm config.

    This exercises the same pipeline as setuptools-scm at build time:
    parse the git describe string, apply our tag_regex, and format the version.
    """
    tag, distance, node, dirty = _git_parse_describe(describe_output)
    v = meta(tag=tag, distance=distance, dirty=dirty, node=node, config=_scm_config)
    return format_version(v)


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
        Test that kolibri.__version__ is set and looks like a version string
        """
        # With setuptools-scm, verify the version is a non-empty string
        # containing at least major.minor
        self.assertIsInstance(kolibri.__version__, str)
        self.assertRegex(kolibri.__version__, r"\d+\.\d+")

    def test_at_final_tag(self):
        """
        Test that at a final tag, the version is just the tag.
        git describe "v0.1.0" == "0.1.0"
        """
        v = _scm_version("v0.1.0")
        self.assertEqual("0.1.0", v)

    def test_at_alpha_1_tag(self):
        """
        Test that our custom tag format for alpha releases is parsed correctly.
        git describe "v0.1.0-alpha1" == "0.1.0a1"
        """
        v = _scm_version("v0.1.0-alpha1")
        self.assertEqual("0.1.0a1", v)

    def test_at_beta_1_tag(self):
        """
        Test that our custom tag format for beta releases is parsed correctly.
        git describe "v0.1.0-beta1" == "0.1.0b1"
        """
        v = _scm_version("v0.1.0-beta1")
        self.assertEqual("0.1.0b1", v)

    def test_at_rc_1_tag(self):
        """
        Test that our custom tag format for release candidates is parsed correctly.
        git describe "v0.1.0-rc1" == "0.1.0rc1"
        """
        v = _scm_version("v0.1.0-rc1")
        self.assertEqual("0.1.0rc1", v)

    def test_commits_after_alpha_tag(self):
        """
        Test that commits after an alpha tag produce a dev version.
        setuptools-scm bumps the pre-release number and uses devN format.
        git describe "v0.1.0-alpha1-123-gabcdfe12" == "0.1.0a2.dev123+gabcdfe12"
        (Old custom versioning produced "0.1.0a1.dev0+git.123.abcdfe12")
        """
        v = _scm_version("v0.1.0-alpha1-123-gabcdfe12")
        self.assertEqual("0.1.0a2.dev123+gabcdfe12", v)

    def test_commits_after_beta_tag(self):
        """
        Test that commits after a beta tag produce a dev version.
        git describe "v0.1.0-beta1-123-gabcdfe12" == "0.1.0b2.dev123+gabcdfe12"
        (Old custom versioning produced "0.1.0b1.dev0+git.123.abcdfe12")
        """
        v = _scm_version("v0.1.0-beta1-123-gabcdfe12")
        self.assertEqual("0.1.0b2.dev123+gabcdfe12", v)

    def test_commits_after_final_tag(self):
        """
        Test that commits after a final tag produce a dev version for the next patch.
        git describe "v0.1.1-6-gdef09150" == "0.1.2.dev6+gdef09150"
        (Old custom versioning produced "0.1.1a0.dev0+git.6.gdef09150")
        """
        v = _scm_version("v0.1.1-6-gdef09150")
        self.assertEqual("0.1.2.dev6+gdef09150", v)

    def test_final_patch_tag(self):
        """
        Test that a final patch release tag produces the expected version.
        git describe "v0.1.1" == "0.1.1"
        """
        v = _scm_version("v0.1.1")
        self.assertEqual(v, "0.1.1")

    def test_final_tag_v0_15_8(self):
        """
        Test a real-world final release tag.
        git describe "v0.15.8" == "0.15.8"
        """
        v = _scm_version("v0.15.8")
        self.assertEqual(v, "0.15.8")

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
