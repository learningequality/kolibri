"""Tests for scripts/generate_changelog.py."""

import shutil
import subprocess

import pytest

# scripts/ is put on sys.path by tests/conftest.py
from generate_changelog import debian_upstream_version
from generate_changelog import debian_version
from generate_changelog import render_changelog

requires_dpkg = pytest.mark.skipif(
    shutil.which("dpkg") is None, reason="dpkg not available"
)
requires_dpkg_dev = pytest.mark.skipif(
    shutil.which("dpkg-parsechangelog") is None, reason="dpkg-dev not available"
)

# --- PEP 440 -> Debian upstream version conversion ---


class TestDebianUpstreamVersion:
    """A missing part sorts before any present part *except* ``~`` in Debian,
    so a PEP 440 pre-release/dev segment must gain a leading ``~`` to sort
    before the corresponding final release."""

    def test_final_release_is_unchanged(self):
        assert debian_upstream_version("0.19.0") == "0.19.0"

    def test_alpha_gets_tilde(self):
        assert debian_upstream_version("0.19.0a1") == "0.19.0~a1"

    def test_beta_gets_tilde(self):
        assert debian_upstream_version("0.19.0b1") == "0.19.0~b1"

    def test_release_candidate_gets_tilde(self):
        assert debian_upstream_version("0.19.0rc1") == "0.19.0~rc1"

    def test_dev_segment_gets_tilde_and_drops_dot(self):
        assert debian_upstream_version("0.19.0.dev0") == "0.19.0~dev0"

    def test_dev_plus_local_build(self):
        assert (
            debian_upstream_version("0.19.5.dev1040+g6f4a6026d.d20260712")
            == "0.19.5~dev1040+g6f4a6026d.d20260712"
        )


class TestDebianVersion:
    """The full Debian version appends the native ``-0ubuntuN`` revision, as
    the old hand-maintained ``0.5.1-0ubuntu1`` changelog did."""

    def test_appends_ubuntu_revision(self):
        assert debian_version("0.19.0") == "0.19.0-0ubuntu1"

    @requires_dpkg
    def test_prerelease_sorts_before_final(self):
        earlier = debian_version("0.19.0b1")
        later = debian_version("0.19.0")
        assert (
            subprocess.call(["dpkg", "--compare-versions", earlier, "lt", later]) == 0
        )

    @requires_dpkg
    def test_bound_version_upgrades_over_legacy_scheme(self):
        # 0.19.x must be a monotonic upgrade over the old independent 0.5.x so
        # apt upgrades cleanly.
        assert (
            subprocess.call(
                [
                    "dpkg",
                    "--compare-versions",
                    debian_version("0.19.0"),
                    "gt",
                    "0.5.1-0ubuntu1",
                ]
            )
            == 0
        )


class TestRenderChangelog:
    """The rendered changelog must be parseable by ``dpkg-parsechangelog``."""

    def test_first_line_carries_package_version_and_distribution(self):
        entry = render_changelog(
            "0.19.0-0ubuntu1",
            "noble",
            "Learning Equality <accounts@learningequality.org>",
            "Sat, 12 Jul 2026 12:00:00 +0000",
        )
        assert entry.startswith("kolibri-server (0.19.0-0ubuntu1) noble;")

    @requires_dpkg_dev
    def test_parseable_by_dpkg(self, tmp_path):
        entry = render_changelog(
            "0.19.0-0ubuntu1",
            "jammy",
            "Learning Equality <accounts@learningequality.org>",
            "Sat, 12 Jul 2026 12:00:00 +0000",
        )
        changelog = tmp_path / "changelog"
        changelog.write_text(entry)
        version = subprocess.check_output(
            ["dpkg-parsechangelog", "-S", "Version", "-l", str(changelog)]
        )
        assert version.decode().strip() == "0.19.0-0ubuntu1"
