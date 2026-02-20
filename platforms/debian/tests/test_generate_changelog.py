import json
from unittest.mock import MagicMock, patch

from build_tools.generate_changelog import (
    parse_existing_changelog,
    parse_packaging_changelog,
    kolibri_version_key,
    is_prerelease,
    format_changelog_entry,
    github_timestamp_to_debian,
    fetch_github_releases,
    filter_new_releases,
    generate_release_entries,
    interleave_entries,
    generate_updated_changelog,
    main,
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
    latest_version, latest_revision, existing_content = parse_existing_changelog(SAMPLE_CHANGELOG)
    assert latest_version == "0.19.1"
    assert latest_revision == 1


def test_parse_existing_changelog_preserves_content():
    latest_version, latest_revision, existing_content = parse_existing_changelog(SAMPLE_CHANGELOG)
    assert existing_content == SAMPLE_CHANGELOG


def test_version_ordering_basic():
    versions = ["0.17.0", "0.19.1", "0.18.0", "0.19.0"]
    assert sorted(versions, key=kolibri_version_key) == [
        "0.17.0", "0.18.0", "0.19.0", "0.19.1"
    ]


def test_version_ordering_with_prerelease():
    versions = ["0.19.1", "0.19.2-alpha0", "0.19.1-rc0", "0.19.0"]
    assert sorted(versions, key=kolibri_version_key) == [
        "0.19.0", "0.19.1-rc0", "0.19.1", "0.19.2-alpha0"
    ]


def test_is_prerelease():
    assert is_prerelease("0.19.2-alpha0") is True
    assert is_prerelease("0.19.1-rc0") is True
    assert is_prerelease("0.19.1-beta1") is True
    assert is_prerelease("0.19.1") is False
    assert is_prerelease("0.19.0") is False


def test_version_newer_than():
    assert kolibri_version_key("0.19.2") > kolibri_version_key("0.19.1")
    assert kolibri_version_key("0.19.1-rc0") < kolibri_version_key("0.19.1")


def test_format_changelog_entry():
    entry = format_changelog_entry(
        version="0.19.2",
        ubuntu_revision=1,
        distribution="noble",
        message="New upstream release",
        maintainer="Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>",
        timestamp="Thu, 31 Oct 2025 16:09:14 +0100",
    )
    expected = """\
kolibri-source (0.19.2-0ubuntu1) noble; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Thu, 31 Oct 2025 16:09:14 +0100
"""
    assert entry == expected


def test_format_changelog_entry_prerelease():
    """Prerelease versions use ~ in Debian version string."""
    entry = format_changelog_entry(
        version="0.19.2-alpha0",
        ubuntu_revision=1,
        distribution="noble",
        message="New upstream release",
        maintainer="Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>",
        timestamp="Thu, 06 Feb 2026 19:46:25 +0000",
    )
    assert "kolibri-source (0.19.2~alpha0-0ubuntu1)" in entry


def test_github_timestamp_to_debian():
    result = github_timestamp_to_debian("2026-01-20T16:54:38Z")
    assert result == "Tue, 20 Jan 2026 16:54:38 +0000"


def test_github_timestamp_to_debian_another():
    result = github_timestamp_to_debian("2025-10-31T15:09:14Z")
    assert result == "Fri, 31 Oct 2025 15:09:14 +0000"


def _mock_urlopen_pages(pages):
    """Create a mock for urllib that returns paginated results.

    pages: list of (response_body, next_link_or_none)
    """
    responses = []
    for body, next_link in pages:
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(body).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        if next_link:
            mock_response.headers = {"Link": f'<{next_link}>; rel="next"'}
        else:
            mock_response.headers = {}
        responses.append(mock_response)
    return responses


def test_fetch_github_releases_single_page():
    releases = [
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-12-10T16:26:58Z"},
    ]
    mock_responses = _mock_urlopen_pages([(releases, None)])

    with patch("build_tools.generate_changelog.urlopen", side_effect=mock_responses):
        result = fetch_github_releases()

    assert len(result) == 2
    assert result[0]["tag_name"] == "v0.19.1"


def test_fetch_github_releases_pagination():
    page1 = [
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
    ]
    page2 = [
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-12-10T16:26:58Z"},
    ]
    mock_responses = _mock_urlopen_pages([
        (page1, "https://api.github.com/repos/learningequality/kolibri/releases?page=2"),
        (page2, None),
    ])

    with patch("build_tools.generate_changelog.urlopen", side_effect=mock_responses):
        result = fetch_github_releases()

    assert len(result) == 2
    assert result[0]["tag_name"] == "v0.19.1"
    assert result[1]["tag_name"] == "v0.19.0"


def test_fetch_github_releases_stops_early_when_all_old():
    """When latest_existing is provided, stop fetching once all releases on a page are older."""
    page1 = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2026-02-06T19:46:25Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
    ]
    page2 = [
        {"tag_name": "v0.18.0", "prerelease": False, "published_at": "2025-06-01T00:00:00Z"},
    ]
    mock_responses = _mock_urlopen_pages([
        (page1, "https://api.github.com/repos/learningequality/kolibri/releases?page=2"),
        (page2, None),
    ])

    with patch("build_tools.generate_changelog.urlopen", side_effect=mock_responses):
        result = fetch_github_releases(latest_existing="0.19.1")

    # Should fetch page 1 (has v0.19.2 which is newer) but stop before page 2
    # because v0.19.1 <= latest_existing means remaining pages are all older
    assert len(result) == 2
    assert result[0]["tag_name"] == "v0.19.2"


def test_fetch_github_releases_fetches_all_when_no_latest():
    """Without latest_existing, all pages are fetched."""
    page1 = [
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
    ]
    page2 = [
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-12-10T16:26:58Z"},
    ]
    mock_responses = _mock_urlopen_pages([
        (page1, "https://api.github.com/repos/learningequality/kolibri/releases?page=2"),
        (page2, None),
    ])

    with patch("build_tools.generate_changelog.urlopen", side_effect=mock_responses):
        result = fetch_github_releases()

    assert len(result) == 2



def test_filter_new_releases_excludes_old():
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2026-02-06T19:46:25Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-12-10T16:26:58Z"},
    ]
    result = filter_new_releases(releases, latest_existing="0.19.1", build_version="0.19.2")
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_excludes_prereleases():
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2026-02-06T19:46:25Z"},
        {"tag_name": "v0.19.2-rc0", "prerelease": True, "published_at": "2026-02-01T10:00:00Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
    ]
    result = filter_new_releases(releases, latest_existing="0.19.1", build_version="0.19.2")
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_includes_current_prerelease():
    """If build version is itself a prerelease, include it."""
    releases = [
        {"tag_name": "0.19.2-alpha0", "prerelease": True, "published_at": "2026-02-06T19:46:25Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2026-01-20T16:54:38Z"},
    ]
    result = filter_new_releases(releases, latest_existing="0.19.1", build_version="0.19.2-alpha0")
    assert len(result) == 1
    assert result[0]["tag_name"] == "0.19.2-alpha0"


def test_filter_new_releases_skips_invalid_versions():
    """Releases with non-PEP 440 versions (e.g. '0.1.0__MVP') are skipped."""
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2026-02-06T19:46:25Z"},
        {"tag_name": "v0.1.0__MVP", "prerelease": False, "published_at": "2015-01-01T00:00:00Z"},
        {"tag_name": "v0.0.1-docs-only", "prerelease": False, "published_at": "2014-01-01T00:00:00Z"},
    ]
    result = filter_new_releases(releases, latest_existing="0.19.1", build_version="0.19.2")
    assert len(result) == 1
    assert result[0]["tag_name"] == "v0.19.2"


def test_filter_new_releases_strips_v_prefix():
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2026-02-06T19:46:25Z"},
    ]
    result = filter_new_releases(releases, latest_existing="0.19.1", build_version="0.19.2")
    assert len(result) == 1


def test_generate_release_entries():
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2025-10-31T15:09:14Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2025-10-03T17:47:04Z"},
    ]
    with patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
        entries = generate_release_entries(releases)

    assert len(entries) == 2
    assert "0.19.2-0ubuntu1" in entries[0]["text"]
    assert "0.19.1-0ubuntu1" in entries[1]["text"]
    assert "noble" in entries[0]["text"]
    assert entries[0]["version"] == "0.19.2"
    assert entries[0]["ubuntu_revision"] == 1


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

def test_generate_updated_changelog_prepends_entries():
    """New entries are prepended to existing changelog content."""
    existing_changelog = SAMPLE_CHANGELOG
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2025-10-31T15:09:14Z"},
    ]
    with patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
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


def test_generate_updated_changelog_interleaves_packaging():
    """Packaging entries from CHANGELOG are interleaved with release entries."""
    existing_changelog = """\
kolibri-source (0.18.4-0ubuntu1) jammy; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 06 Oct 2025 16:20:34 -0700
"""
    releases = [
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2025-10-31T15:09:14Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2025-10-03T17:47:04Z"},
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-08-06T18:21:16Z"},
    ]
    packaging_changelog = SAMPLE_PACKAGING_CHANGELOG  # 0.19.1-0ubuntu2

    with patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
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
    with patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
        result = generate_updated_changelog(
            existing_content=existing_changelog,
            releases=[],
            packaging_changelog="",
            build_version="0.19.1",
        )
    # With no new releases, output should be same as input
    assert result == existing_changelog


def test_generate_updated_changelog_packaging_retains_distribution():
    """Packaging entries retain their original distribution, not the current LTS."""
    existing_changelog = """\
kolibri-source (0.18.4-0ubuntu1) jammy; urgency=medium

  * New upstream release

 -- Learning Equality \\(Learning Equality\\'s public signing key\\) <accounts@learningequality.org>>  Mon, 06 Oct 2025 16:20:34 -0700
"""
    releases = [
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2025-10-03T17:47:04Z"},
    ]
    packaging_changelog = SAMPLE_PACKAGING_CHANGELOG  # 0.19.1-0ubuntu2, jammy

    with patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
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
        assert False, "0.19.1-0ubuntu2 entry not found"


# --- Tests for main() entrypoint ---

def test_main_writes_updated_changelog(tmp_path):
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
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2025-10-31T15:09:14Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2025-10-03T17:47:04Z"},
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-08-06T18:21:16Z"},
    ]

    with patch("build_tools.generate_changelog.fetch_github_releases", return_value=releases), \
         patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
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


def test_main_with_packaging_changelog(tmp_path):
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
        {"tag_name": "v0.19.2", "prerelease": False, "published_at": "2025-10-31T15:09:14Z"},
        {"tag_name": "v0.19.1", "prerelease": False, "published_at": "2025-10-03T17:47:04Z"},
        {"tag_name": "v0.19.0", "prerelease": False, "published_at": "2025-08-06T18:21:16Z"},
    ]

    with patch("build_tools.generate_changelog.fetch_github_releases", return_value=releases), \
         patch("build_tools.generate_changelog.get_current_lts_codename", return_value="noble"):
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
