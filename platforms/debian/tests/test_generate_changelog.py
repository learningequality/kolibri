import json
import os
from email.utils import parseaddr
from unittest.mock import MagicMock
from unittest.mock import patch
from urllib.error import HTTPError

import pytest
import vcr

from build_tools.generate_changelog import cli
from build_tools.generate_changelog import fetch_github_releases
from build_tools.generate_changelog import filter_new_releases
from build_tools.generate_changelog import format_changelog_entry
from build_tools.generate_changelog import generate_release_entries
from build_tools.generate_changelog import generate_updated_changelog
from build_tools.generate_changelog import github_timestamp_to_debian
from build_tools.generate_changelog import interleave_entries
from build_tools.generate_changelog import kolibri_version_key
from build_tools.generate_changelog import main
from build_tools.generate_changelog import MAINTAINER
from build_tools.generate_changelog import parse_existing_changelog
from build_tools.generate_changelog import parse_packaging_changelog
from build_tools.generate_changelog import version_to_debian

my_vcr = vcr.VCR(
    cassette_library_dir=os.path.join(os.path.dirname(__file__), "cassettes"),
    record_mode="none",
    path_transformer=vcr.VCR.ensure_suffix(".yaml"),
    filter_headers=["authorization"],
)

SAMPLE_CHANGELOG = """\
kolibri-source (0.19.1-0ubuntu1) noble; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Tue, 20 Jan 2026 13:55:06 -0800

kolibri-source (0.19.0-0ubuntu1) noble; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Wed, 10 Dec 2025 16:26:58 -0800
"""


def test_parse_existing_changelog_returns_latest_version():
    assert parse_existing_changelog(SAMPLE_CHANGELOG) == "0.19.1"


def test_version_ordering_basic():
    versions = ["0.17.0", "0.19.1", "0.18.0", "0.19.0"]
    assert sorted(versions, key=kolibri_version_key) == [
        "0.17.0",
        "0.18.0",
        "0.19.0",
        "0.19.1",
    ]


def test_version_ordering_with_prerelease():
    versions = ["0.19.1", "0.19.2-alpha0", "0.19.1-rc0", "0.19.0"]
    assert sorted(versions, key=kolibri_version_key) == [
        "0.19.0",
        "0.19.1-rc0",
        "0.19.1",
        "0.19.2-alpha0",
    ]


def test_version_newer_than():
    assert kolibri_version_key("0.19.2") > kolibri_version_key("0.19.1")
    assert kolibri_version_key("0.19.1-rc0") < kolibri_version_key("0.19.1")


def test_format_changelog_entry():
    entry = format_changelog_entry(
        version="0.19.2",
        ubuntu_revision=1,
        distribution="noble",
        message="New upstream release",
        maintainer="Learning Equality <accounts@learningequality.org>",
        timestamp="Thu, 31 Oct 2025 16:09:14 +0100",
    )
    expected = """\
kolibri-source (0.19.2-0ubuntu1) noble; urgency=medium

  * New upstream release

 -- Learning Equality <accounts@learningequality.org>  Thu, 31 Oct 2025 16:09:14 +0100
"""
    assert entry == expected


def test_format_changelog_entry_prerelease():
    """Prerelease versions use ~ in Debian version string."""
    entry = format_changelog_entry(
        version="0.19.2-alpha0",
        ubuntu_revision=1,
        distribution="noble",
        message="New upstream release",
        maintainer="Learning Equality <accounts@learningequality.org>",
        timestamp="Thu, 06 Feb 2026 19:46:25 +0000",
    )
    assert "kolibri-source (0.19.2~alpha0-0ubuntu1)" in entry


@pytest.mark.parametrize(
    "version,expected",
    [
        ("0.19.1", "0.19.1"),
        ("0.19.2-alpha0", "0.19.2~alpha0"),
        ("0.20.0a1", "0.20.0~alpha1"),
        ("0.19.1-beta1", "0.19.1~beta1"),
        ("0.19.1b1", "0.19.1~beta1"),
        ("0.19.2-rc1", "0.19.2~rc1"),
        ("0.19.2rc1", "0.19.2~rc1"),
        ("0.20.0.dev0", "0.20.0~dev0"),
    ],
)
def test_version_to_debian(version, expected):
    assert version_to_debian(version) == expected


def test_cli_prints_debian_version(tmp_path, capsys):
    version_file = tmp_path / "VERSION"
    version_file.write_text("0.20.0a1\n")
    cli(["--version-file", str(version_file), "--print-debian-version"])
    assert capsys.readouterr().out == "0.20.0~alpha1\n"


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_cli_writes_entries_for_named_package(_mock_codename, tmp_path):
    changelog_path = tmp_path / "changelog"
    changelog_path.write_text(
        "kolibri-server (0.5.1-0ubuntu1) jammy; urgency=medium\n"
        "\n"
        "  * Old release\n"
        "\n"
        " -- Learning Equality <accounts@learningequality.org>  "
        "Mon, 31 Mar 2026 12:00:00 -0800\n"
    )
    version_path = tmp_path / "VERSION"
    version_path.write_text("0.19.2\n")
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2026-02-06T19:46:25Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2026-01-20T16:54:38Z",
        },
    ]

    with patch(
        "build_tools.generate_changelog.urlopen",
        return_value=_releases_response(releases),
    ):
        cli(
            [
                "--package",
                "kolibri-server",
                "--debian-changelog",
                str(changelog_path),
                "--version-file",
                str(version_path),
                "--packaging-changelog",
                str(tmp_path / "missing"),
            ]
        )

    headers = [
        line
        for line in changelog_path.read_text().splitlines()
        if line and not line[0].isspace()
    ]
    assert headers == [
        "kolibri-server (0.19.2-0ubuntu1) noble; urgency=medium",
        "kolibri-server (0.19.1-0ubuntu1) noble; urgency=medium",
        "kolibri-server (0.5.1-0ubuntu1) jammy; urgency=medium",
    ]


def test_maintainer_is_valid_mailbox():
    """MAINTAINER must be a valid RFC822 mailbox.

    Regression: it previously contained backslash escapes and a doubled
    '>' (``... <accounts@learningequality.org>>``), which dpkg-genchanges
    on newer Ubuntu series (resolute) rejects as an invalid email address,
    aborting the Launchpad build.
    """
    name, email = parseaddr(MAINTAINER)
    assert email == "accounts@learningequality.org"
    assert name == "Learning Equality"
    assert "\\" not in MAINTAINER
    assert MAINTAINER.count("<") == 1
    assert MAINTAINER.count(">") == 1


def test_generated_entry_uses_valid_maintainer():
    """Entries generated via the MAINTAINER constant carry a valid mailbox."""
    with patch(
        "build_tools.generate_changelog.UbuntuDistroInfo",
        **{"return_value.lts.return_value": "noble"},
    ):
        entries = generate_release_entries(
            [
                {
                    "tag_name": "v0.19.2",
                    "prerelease": False,
                    "published_at": "2025-10-31T15:09:14Z",
                }
            ]
        )
    trailer = next(
        ln for ln in entries[0]["text"].splitlines() if ln.startswith(" -- ")
    )
    # Trailer format: " -- {maintainer}  {timestamp}"; maintainer and
    # timestamp are separated by exactly two spaces.
    maintainer = trailer[len(" -- ") :].split("  ", 1)[0]
    _, email = parseaddr(maintainer)
    assert email == "accounts@learningequality.org"
    assert "\\" not in maintainer


def test_github_timestamp_to_debian():
    result = github_timestamp_to_debian("2026-01-20T16:54:38Z")
    assert result == "Tue, 20 Jan 2026 16:54:38 +0000"


def test_github_timestamp_to_debian_another():
    result = github_timestamp_to_debian("2025-10-31T15:09:14Z")
    assert result == "Fri, 31 Oct 2025 15:09:14 +0000"


@my_vcr.use_cassette("releases_full")
def test_fetch_github_releases_returns_releases():
    """Fetching releases returns a non-empty list with expected structure."""
    result = fetch_github_releases()
    assert len(result) == 152
    # Each release has the expected keys from the real GitHub API
    for release in result:
        assert "tag_name" in release
        assert "prerelease" in release
        assert "published_at" in release
    # Results are ordered newest-first (as GitHub returns them)
    assert result[0]["tag_name"] == "0.19.2-alpha0"
    assert result[1]["tag_name"] == "v0.19.1"


@my_vcr.use_cassette("releases_full")
def test_fetch_github_releases_pagination():
    """Pagination is followed correctly across multiple pages."""
    result = fetch_github_releases()
    # Cassette has 2 pages: 100 + 52 releases
    assert len(result) == 152
    # Releases from page 2 are included (v0.13.1 is the first on page 2)
    tags = [r["tag_name"] for r in result]
    assert "v0.13.1" in tags


@my_vcr.use_cassette("releases_full")
def test_fetch_github_releases_stops_early_when_all_old():
    """When latest_existing is provided, stop fetching once all releases on a page are older."""
    # v0.19.0 is on page 1 — once the oldest release on page 1 (v0.13.2)
    # is seen to be <= latest_existing="0.19.0", pagination stops.
    result = fetch_github_releases(latest_existing="0.19.0")
    # Should only fetch page 1 (100 releases), not follow to page 2
    assert len(result) == 100
    assert result[0]["tag_name"] == "0.19.2-alpha0"
    # Page 2 releases should NOT be present
    tags = [r["tag_name"] for r in result]
    assert "v0.13.1" not in tags


@my_vcr.use_cassette("releases_full")
def test_fetch_github_releases_fetches_all_when_no_latest():
    """Without latest_existing, all pages are fetched."""
    result = fetch_github_releases()
    assert len(result) == 152
    # Includes releases from both pages
    tags = [r["tag_name"] for r in result]
    assert "v0.19.1" in tags  # page 1
    assert "v0.13.1" in tags  # page 2


def _releases_response(releases):
    response = MagicMock()
    response.__enter__.return_value = response
    response.read.return_value = json.dumps(releases).encode()
    response.headers = {}
    return response


def _http_error(code):
    return HTTPError("https://api.github.com", code, "err", {}, None)


@patch("build_tools.generate_changelog.time.sleep")
def test_fetch_github_releases_retries_server_error(_sleep):
    releases = [{"tag_name": "v0.19.2"}]
    with patch(
        "build_tools.generate_changelog.urlopen",
        side_effect=[_http_error(502), _releases_response(releases)],
    ):
        assert fetch_github_releases() == releases


@patch("build_tools.generate_changelog.time.sleep")
def test_fetch_github_releases_does_not_retry_rate_limit(_sleep):
    with patch(
        "build_tools.generate_changelog.urlopen", side_effect=_http_error(403)
    ) as urlopen:
        with pytest.raises(HTTPError):
            fetch_github_releases()
    assert urlopen.call_count == 1


@patch("build_tools.generate_changelog.time.sleep")
def test_fetch_github_releases_gives_up_after_attempts(_sleep):
    with patch(
        "build_tools.generate_changelog.urlopen", side_effect=_http_error(503)
    ) as urlopen:
        with pytest.raises(HTTPError):
            fetch_github_releases()
    assert urlopen.call_count == 3


def test_filter_new_releases_excludes_old():
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2026-02-06T19:46:25Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2026-01-20T16:54:38Z",
        },
        {
            "tag_name": "v0.19.0",
            "prerelease": False,
            "published_at": "2025-12-10T16:26:58Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.1", build_version="0.19.2"
    )
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_excludes_prereleases():
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2026-02-06T19:46:25Z",
        },
        {
            "tag_name": "v0.19.2-rc0",
            "prerelease": True,
            "published_at": "2026-02-01T10:00:00Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2026-01-20T16:54:38Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.1", build_version="0.19.2"
    )
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_includes_current_prerelease():
    """If build version is itself a prerelease, include it."""
    releases = [
        {
            "tag_name": "0.19.2-alpha0",
            "prerelease": True,
            "published_at": "2026-02-06T19:46:25Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2026-01-20T16:54:38Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.1", build_version="0.19.2-alpha0"
    )
    assert len(result) == 1
    assert result[0]["tag_name"] == "0.19.2-alpha0"


def test_filter_new_releases_matches_current_prerelease_across_version_spellings():
    """The sdist VERSION file spells prereleases PEP 440 style; tags do not."""
    releases = [
        {
            "tag_name": "v0.20.0-alpha1",
            "prerelease": True,
            "published_at": "2026-09-01T10:00:00Z",
        },
        {
            "tag_name": "v0.19.5",
            "prerelease": False,
            "published_at": "2026-08-01T10:00:00Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.5", build_version="0.20.0a1"
    )
    assert [r["tag_name"] for r in result] == ["v0.20.0-alpha1"]


def test_filter_new_releases_skips_invalid_versions():
    """Releases with non-PEP 440 versions (e.g. '0.1.0__MVP') are skipped."""
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2026-02-06T19:46:25Z",
        },
        {
            "tag_name": "v0.1.0__MVP",
            "prerelease": False,
            "published_at": "2015-01-01T00:00:00Z",
        },
        {
            "tag_name": "v0.0.1-docs-only",
            "prerelease": False,
            "published_at": "2014-01-01T00:00:00Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.1", build_version="0.19.2"
    )
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_strips_v_prefix():
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2026-02-06T19:46:25Z",
        },
    ]
    result = filter_new_releases(
        releases, latest_existing="0.19.1", build_version="0.19.2"
    )
    assert len(result) == 1


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_release_entries(_mock_codename):
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2025-10-03T17:47:04Z",
        },
    ]
    entries = generate_release_entries(releases)

    assert len(entries) == 2
    assert "0.19.2-0ubuntu1" in entries[0]["text"]
    assert "0.19.1-0ubuntu1" in entries[1]["text"]
    assert "noble" in entries[0]["text"]
    assert entries[0]["version"] == "0.19.2"
    assert entries[0]["ubuntu_revision"] == 1


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_release_entries_respects_ubuntu_revision(_mock_codename):
    """A bumped revision re-releases the same upstream version as -0ubuntuN."""
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
    ]
    entries = generate_release_entries(releases, ubuntu_revision=2)
    assert entries[0]["ubuntu_revision"] == 2
    assert "0.19.2-0ubuntu2" in entries[0]["text"]
    assert "0.19.2-0ubuntu1" not in entries[0]["text"]


# --- Tests for CHANGELOG parsing ---

SAMPLE_PACKAGING_CHANGELOG = """\
kolibri-source (0.19.1-0ubuntu2) jammy; urgency=medium

  * jelly still needed for jammy support

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 08 Oct 2025 18:07:02 +0200
"""


def test_parse_packaging_changelog_returns_entries():
    entries = parse_packaging_changelog(SAMPLE_PACKAGING_CHANGELOG)
    assert len(entries) == 1
    assert entries[0]["version"] == "0.19.1"
    assert entries[0]["ubuntu_revision"] == 2
    assert "jelly still needed" in entries[0]["text"]


def test_parse_packaging_changelog_preserves_distribution():
    """Packaging entries retain their original distribution (e.g. jammy)."""
    entries = parse_packaging_changelog(SAMPLE_PACKAGING_CHANGELOG)
    assert "jammy" in entries[0]["text"]


def test_parse_packaging_changelog_multiple_entries():
    content = """\
kolibri-source (0.19.2-0ubuntu2) noble; urgency=medium

  * Fixed build script

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Thu, 14 Nov 2025 10:00:00 +0000

kolibri-source (0.19.1-0ubuntu2) jammy; urgency=medium

  * jelly still needed for jammy support

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 08 Oct 2025 18:07:02 +0200
"""
    entries = parse_packaging_changelog(content)
    assert len(entries) == 2
    assert entries[0]["version"] == "0.19.2"
    assert entries[1]["version"] == "0.19.1"


def test_parse_packaging_changelog_empty():
    entries = parse_packaging_changelog("")
    assert entries == []


# --- Tests for interleaving ---


def test_interleave_entries_basic():
    """Release and packaging entries are interleaved by version, newest first."""
    release_entries = [
        {"version": "0.19.0", "ubuntu_revision": 1, "text": "0.19.0-0ubuntu1 entry\n"},
        {"version": "0.19.1", "ubuntu_revision": 1, "text": "0.19.1-0ubuntu1 entry\n"},
        {"version": "0.19.2", "ubuntu_revision": 1, "text": "0.19.2-0ubuntu1 entry\n"},
    ]
    packaging_entries = [
        {"version": "0.19.1", "ubuntu_revision": 2, "text": "0.19.1-0ubuntu2 entry\n"},
    ]
    result = interleave_entries(release_entries, packaging_entries)
    versions = [(e["version"], e["ubuntu_revision"]) for e in result]
    assert versions == [
        ("0.19.2", 1),
        ("0.19.1", 2),
        ("0.19.1", 1),
        ("0.19.0", 1),
    ]


def test_interleave_entries_no_packaging():
    """When no packaging entries, release entries are returned newest-first."""
    release_entries = [
        {"version": "0.19.0", "ubuntu_revision": 1, "text": "entry1\n"},
        {"version": "0.19.1", "ubuntu_revision": 1, "text": "entry2\n"},
    ]
    result = interleave_entries(release_entries, [])
    assert len(result) == 2
    assert result[0]["version"] == "0.19.1"
    assert result[1]["version"] == "0.19.0"


# --- Tests for generate_updated_changelog ---


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_prepends_entries(_mock_codename):
    """New entries are prepended to existing changelog content."""
    existing_changelog = SAMPLE_CHANGELOG
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
    ]
    result = generate_updated_changelog(
        existing_content=existing_changelog,
        releases=releases,
        packaging_changelog="",
        build_version="0.19.2",
    )
    # New entry should come before existing content
    assert result.index("0.19.2-0ubuntu1") < result.index("0.19.1-0ubuntu1")
    # Existing content preserved
    assert "0.19.1-0ubuntu1" in result
    assert "0.19.0-0ubuntu1" in result


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_interleaves_packaging(_mock_codename):
    """Packaging entries from CHANGELOG are interleaved with release entries."""
    existing_changelog = """\
kolibri-source (0.18.4-0ubuntu1) jammy; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 06 Oct 2025 16:20:34 -0700
"""
    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2025-10-03T17:47:04Z",
        },
        {
            "tag_name": "v0.19.0",
            "prerelease": False,
            "published_at": "2025-08-06T18:21:16Z",
        },
    ]
    packaging_changelog = SAMPLE_PACKAGING_CHANGELOG  # 0.19.1-0ubuntu2

    result = generate_updated_changelog(
        existing_content=existing_changelog,
        releases=releases,
        packaging_changelog=packaging_changelog,
        build_version="0.19.2",
    )

    # Order should be: 0.19.2, 0.19.1-0ubuntu2, 0.19.1, 0.19.0, then existing (0.18.4)
    pos_192 = result.index("0.19.2-0ubuntu1")
    pos_191_u2 = result.index("0.19.1-0ubuntu2")
    pos_191_u1 = result.index("0.19.1-0ubuntu1")
    pos_190 = result.index("0.19.0-0ubuntu1")
    pos_184 = result.index("0.18.4-0ubuntu1")
    assert pos_192 < pos_191_u2 < pos_191_u1 < pos_190 < pos_184


def test_generate_updated_changelog_preserves_existing():
    """Existing debian/changelog entries are not modified."""
    existing_changelog = SAMPLE_CHANGELOG
    result = generate_updated_changelog(
        existing_content=existing_changelog,
        releases=[],
        packaging_changelog="",
        build_version="0.19.1",
    )
    # With no new releases, output should be same as input
    assert result == existing_changelog


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_packaging_retains_distribution(_mock_codename):
    """Packaging entries retain their original distribution, not the current LTS."""
    existing_changelog = """\
kolibri-source (0.18.4-0ubuntu1) jammy; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 06 Oct 2025 16:20:34 -0700
"""
    releases = [
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2025-10-03T17:47:04Z",
        },
    ]
    packaging_changelog = SAMPLE_PACKAGING_CHANGELOG  # 0.19.1-0ubuntu2, jammy

    result = generate_updated_changelog(
        existing_content=existing_changelog,
        releases=releases,
        packaging_changelog=packaging_changelog,
        build_version="0.19.1",
    )

    # The packaging entry should still say "jammy"
    lines = result.split("\n")
    for line in lines:
        if "0.19.1-0ubuntu2" in line:
            assert "jammy" in line
            break
    else:
        raise AssertionError("0.19.1-0ubuntu2 entry not found")


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_heads_with_unreleased_build_version(
    _mock_codename,
):
    """A build version with no GitHub release still heads the changelog, so
    the changelog version matches the orig tarball's DEB_VERSION."""
    result = generate_updated_changelog(
        existing_content=SAMPLE_CHANGELOG,
        releases=[
            {
                "tag_name": "v0.19.2",
                "prerelease": False,
                "published_at": "2026-02-06T19:46:25Z",
            },
        ],
        packaging_changelog="",
        build_version="0.20.0.dev0+g1234",
        ubuntu_revision=3,
    )
    assert result.startswith("kolibri-source (0.20.0~dev0-0ubuntu3) noble;")
    assert result.index("0.19.2-0ubuntu3") < result.index("0.19.1-0ubuntu1")


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_excludes_releases_newer_than_build(
    _mock_codename,
):
    result = generate_updated_changelog(
        existing_content=SAMPLE_CHANGELOG,
        releases=[
            {
                "tag_name": "v0.19.3",
                "prerelease": False,
                "published_at": "2026-03-20T00:16:44Z",
            },
            {
                "tag_name": "v0.19.2",
                "prerelease": False,
                "published_at": "2026-02-06T19:46:25Z",
            },
        ],
        packaging_changelog="",
        build_version="0.19.2",
    )
    assert result.startswith("kolibri-source (0.19.2-0ubuntu1) noble;")
    assert "0.19.3" not in result


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_heads_with_build_older_than_existing_head(
    _mock_codename,
):
    result = generate_updated_changelog(
        existing_content=SAMPLE_CHANGELOG,
        releases=[],
        packaging_changelog="",
        build_version="0.19.1.dev4+gabc",
    )
    assert result.startswith("kolibri-source (0.19.1~dev4-0ubuntu1) noble;")
    assert result.endswith(SAMPLE_CHANGELOG)


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_generate_updated_changelog_is_idempotent_for_dev_build(_mock_codename):
    kwargs = {
        "releases": [],
        "packaging_changelog": "",
        "build_version": "0.20.0a2.dev1451+gabc",
    }
    once = generate_updated_changelog(existing_content=SAMPLE_CHANGELOG, **kwargs)
    twice = generate_updated_changelog(existing_content=once, **kwargs)
    assert once.startswith("kolibri-source (0.20.0~alpha2~dev1451-0ubuntu1) noble;")
    assert twice == once


# --- Tests for main() entrypoint ---


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_main_writes_updated_changelog(_mock_codename, tmp_path):
    """main() reads files, fetches releases, and writes updated debian/changelog."""
    # Set up file structure
    debian_dir = tmp_path / "debian"
    debian_dir.mkdir()
    changelog_path = debian_dir / "changelog"
    changelog_path.write_text(SAMPLE_CHANGELOG)

    version_path = tmp_path / "VERSION"
    version_path.write_text("0.19.2")

    packaging_changelog_path = tmp_path / "CHANGELOG"
    packaging_changelog_path.write_text("")

    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2025-10-03T17:47:04Z",
        },
        {
            "tag_name": "v0.19.0",
            "prerelease": False,
            "published_at": "2025-08-06T18:21:16Z",
        },
    ]

    with patch(
        "build_tools.generate_changelog.urlopen",
        return_value=_releases_response(releases),
    ):
        main(
            debian_changelog_path=str(changelog_path),
            version_path=str(version_path),
            packaging_changelog_path=str(packaging_changelog_path),
        )

    result = changelog_path.read_text()
    # New entry for 0.19.2 should be prepended
    assert "0.19.2-0ubuntu1" in result
    # Existing entries preserved
    assert "0.19.1-0ubuntu1" in result
    assert "0.19.0-0ubuntu1" in result


@patch(
    "build_tools.generate_changelog.UbuntuDistroInfo",
    **{"return_value.lts.return_value": "noble"},
)
def test_main_with_packaging_changelog(_mock_codename, tmp_path):
    """main() interleaves packaging CHANGELOG entries."""
    debian_dir = tmp_path / "debian"
    debian_dir.mkdir()
    changelog_path = debian_dir / "changelog"
    existing = """\
kolibri-source (0.18.4-0ubuntu1) jammy; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 06 Oct 2025 16:20:34 -0700
"""
    changelog_path.write_text(existing)

    version_path = tmp_path / "VERSION"
    version_path.write_text("0.19.2")

    packaging_changelog_path = tmp_path / "CHANGELOG"
    packaging_changelog_path.write_text(SAMPLE_PACKAGING_CHANGELOG)

    releases = [
        {
            "tag_name": "v0.19.2",
            "prerelease": False,
            "published_at": "2025-10-31T15:09:14Z",
        },
        {
            "tag_name": "v0.19.1",
            "prerelease": False,
            "published_at": "2025-10-03T17:47:04Z",
        },
        {
            "tag_name": "v0.19.0",
            "prerelease": False,
            "published_at": "2025-08-06T18:21:16Z",
        },
    ]

    with patch(
        "build_tools.generate_changelog.urlopen",
        return_value=_releases_response(releases),
    ):
        main(
            debian_changelog_path=str(changelog_path),
            version_path=str(version_path),
            packaging_changelog_path=str(packaging_changelog_path),
        )

    result = changelog_path.read_text()
    # Packaging entry should be interleaved
    pos_192 = result.index("0.19.2-0ubuntu1")
    pos_191_u2 = result.index("0.19.1-0ubuntu2")
    pos_191_u1 = result.index("0.19.1-0ubuntu1")
    assert pos_192 < pos_191_u2 < pos_191_u1
