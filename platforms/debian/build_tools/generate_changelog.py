#!/usr/bin/env python3
"""Generate updated debian/changelog from GitHub releases and packaging CHANGELOG."""

import json
import os
import re
from datetime import datetime
from email.utils import format_datetime
from urllib.request import urlopen, Request

try:
    from distro_info import UbuntuDistroInfo
except ImportError:
    UbuntuDistroInfo = None

from packaging.version import InvalidVersion, Version

GITHUB_API_URL = "https://api.github.com/repos/learningequality/kolibri/releases"


# Regex to match the first line of a Debian changelog entry
# e.g.: kolibri-source (0.19.1-0ubuntu1) noble; urgency=medium
CHANGELOG_HEADER_RE = re.compile(
    r"^(\S+)\s+\(([^)]+)\)\s+(\S+);\s+urgency=(\S+)"
)


def parse_debian_version(debian_version):
    """Extract upstream version from a Debian version string.

    '0.19.1-0ubuntu1' -> '0.19.1'
    '0.16.0~rc0-0ubuntu1' -> '0.16.0~rc0'
    """
    if "-" in debian_version:
        return debian_version.rsplit("-", 1)[0]
    return debian_version


def parse_existing_changelog(content):
    """Parse existing debian/changelog content.

    Returns (latest_upstream_version, latest_ubuntu_revision, full_content).
    """
    for line in content.splitlines():
        match = CHANGELOG_HEADER_RE.match(line)
        if match:
            debian_version = match.group(2)
            upstream_version = parse_debian_version(debian_version)
            # Convert ~ back to - for Kolibri version format
            upstream_version = upstream_version.replace("~", "-")
            revision_match = re.search(r"-0ubuntu(\d+)", debian_version)
            ubuntu_revision = int(revision_match.group(1)) if revision_match else 1
            return upstream_version, ubuntu_revision, content
    return None, 0, content


def normalize_version(version_str):
    """Normalize a Kolibri version string for packaging.version.Version.

    Converts hyphenated prerelease tags to PEP 440 format.
    '0.19.2-alpha0' -> '0.19.2a0', '0.19.1-rc0' -> '0.19.1rc0'
    """
    version_str = re.sub(r"-alpha(\d+)", r"a\1", version_str)
    version_str = re.sub(r"-beta(\d+)", r"b\1", version_str)
    version_str = re.sub(r"-rc(\d+)", r"rc\1", version_str)
    return version_str


def kolibri_version_key(version_str):
    """Return a sort key for a Kolibri version string."""
    return Version(normalize_version(version_str))


def is_prerelease(version_str):
    """Check if a Kolibri version string is a prerelease."""
    return Version(normalize_version(version_str)).is_prerelease


PACKAGE_NAME = "kolibri-source"
MAINTAINER = (
    "Learning Equality \\(Learning Equality\\'s public signing key\\) "
    "<accounts@learningequality.org>>"
)


def version_to_debian(version_str):
    """Convert a Kolibri version to Debian version format.

    Replaces prerelease hyphens with ~ so they sort before the
    corresponding release in dpkg (~ sorts before anything).
    The .dev suffix is also converted to ~dev.

    Examples:
        '0.19.1'        -> '0.19.1'        (stable: unchanged)
        '0.19.2-alpha0' -> '0.19.2~alpha0' (hyphen becomes tilde)
        '0.19.2-rc1'    -> '0.19.2~rc1'
        '0.20.0.dev0'   -> '0.20.0~dev0'
    """
    result = re.sub(r"-(alpha|beta|rc)", r"~\1", version_str)
    result = re.sub(r"\.dev", r"~dev", result)
    return result


def format_changelog_entry(version, ubuntu_revision, distribution, message,
                           maintainer, timestamp):
    """Format a single Debian changelog entry."""
    deb_version = version_to_debian(version)
    return (
        f"{PACKAGE_NAME} ({deb_version}-0ubuntu{ubuntu_revision}) "
        f"{distribution}; urgency=medium\n"
        f"\n"
        f"  * {message}\n"
        f"\n"
        f" -- {maintainer}  {timestamp}\n"
    )


def github_timestamp_to_debian(iso_timestamp):
    """Convert ISO 8601 timestamp to Debian changelog format.

    '2026-01-20T16:54:38Z' -> 'Tue, 20 Jan 2026 16:54:38 +0000'
    """
    dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    return format_datetime(dt, usegmt=False)


def _parse_link_header(headers):
    """Parse GitHub Link header to find next page URL."""
    link = headers.get("Link", "")
    for part in link.split(","):
        if 'rel="next"' in part:
            url = part.split(";")[0].strip().strip("<>")
            return url
    return None


def fetch_github_releases(latest_existing=None):
    """Fetch Kolibri releases from GitHub API, handling pagination.

    If latest_existing is provided, stops fetching once all releases on a
    page are older than or equal to that version (GitHub returns releases
    newest-first).
    """
    latest_key = kolibri_version_key(latest_existing) if latest_existing else None
    all_releases = []
    url = GITHUB_API_URL + "?per_page=100"

    while url:
        headers = {"Accept": "application/vnd.github.v3+json"}
        token = os.environ.get("GITHUB_TOKEN")
        if token:
            headers["Authorization"] = f"token {token}"
        req = Request(url, headers=headers)
        with urlopen(req) as response:
            data = json.loads(response.read())
            all_releases.extend(data)

            # GitHub returns releases newest-first. If the oldest
            # release on this page is already at or below our latest
            # existing version, subsequent pages will only be older.
            if latest_key and data:
                last_tag = strip_v_prefix(data[-1]["tag_name"])
                try:
                    if kolibri_version_key(last_tag) <= latest_key:
                        break
                except InvalidVersion:
                    pass

            url = _parse_link_header(response.headers)

    return all_releases


def strip_v_prefix(tag_name):
    """Strip leading 'v' from a tag name."""
    return tag_name.lstrip("v")


def filter_new_releases(releases, latest_existing, build_version):
    """Filter GitHub releases to only those newer than latest_existing.

    - Excludes prereleases, UNLESS the release matches build_version
    - Excludes versions <= latest_existing
    - Returns filtered list sorted by version ascending
    """
    latest_key = kolibri_version_key(latest_existing)
    # Ensure build_version has no v prefix for consistent comparison
    build_version = strip_v_prefix(build_version) if build_version else build_version
    filtered = []

    for release in releases:
        version = strip_v_prefix(release["tag_name"])

        try:
            version_key = kolibri_version_key(version)
        except InvalidVersion:
            continue

        # Skip if not newer than latest existing
        if version_key <= latest_key:
            continue

        # Skip prereleases unless it's the current build version
        if release["prerelease"] and version != build_version:
            continue

        filtered.append(release)

    # Sort by version ascending (oldest first, so newest is prepended last)
    filtered.sort(key=lambda r: kolibri_version_key(strip_v_prefix(r["tag_name"])))
    return filtered


def get_current_lts_codename():
    """Get the codename of the current Ubuntu LTS release using distro-info."""
    if UbuntuDistroInfo is None:
        raise ImportError(
            "distro-info package is required. "
            "Install with: sudo apt install python3-distro-info"
        )
    ubuntu = UbuntuDistroInfo()
    return ubuntu.lts()


def generate_release_entries(releases):
    """Generate changelog entry dicts from GitHub release data.

    Returns list of dicts with keys: version, ubuntu_revision, text
    """
    distribution = get_current_lts_codename()
    entries = []

    for release in releases:
        version = strip_v_prefix(release["tag_name"])
        timestamp = github_timestamp_to_debian(release["published_at"])
        text = format_changelog_entry(
            version=version,
            ubuntu_revision=1,
            distribution=distribution,
            message="New upstream release",
            maintainer=MAINTAINER,
            timestamp=timestamp,
        )
        entries.append({
            "version": version,
            "ubuntu_revision": 1,
            "text": text,
        })

    return entries


def parse_packaging_changelog(content):
    """Parse a top-level CHANGELOG file containing packaging-specific entries.

    Returns list of dicts with keys: version, ubuntu_revision, text
    Each entry is a complete Debian changelog stanza from the file.
    """
    if not content or not content.strip():
        return []

    entries = []
    current_lines = []
    current_version = None
    current_revision = None

    for line in content.splitlines(True):
        match = CHANGELOG_HEADER_RE.match(line)
        if match:
            # Save previous entry if any
            if current_version is not None:
                entries.append({
                    "version": current_version,
                    "ubuntu_revision": current_revision,
                    "text": "".join(current_lines),
                })
            # Start new entry
            debian_version = match.group(2)
            upstream = parse_debian_version(debian_version)
            upstream = upstream.replace("~", "-")
            rev_match = re.search(r"-0ubuntu(\d+)", debian_version)
            current_revision = int(rev_match.group(1)) if rev_match else 1
            current_version = upstream
            current_lines = [line]
        else:
            current_lines.append(line)

    # Save last entry
    if current_version is not None:
        entries.append({
            "version": current_version,
            "ubuntu_revision": current_revision,
            "text": "".join(current_lines),
        })

    return entries


def interleave_entries(release_entries, packaging_entries):
    """Interleave release and packaging entries, sorted newest-first.

    Sorting: by version descending, then by ubuntu_revision descending
    (so 0.19.1-0ubuntu2 comes before 0.19.1-0ubuntu1).
    """
    all_entries = list(release_entries) + list(packaging_entries)
    all_entries.sort(
        key=lambda e: (kolibri_version_key(e["version"]), e["ubuntu_revision"]),
        reverse=True,
    )
    return all_entries


def generate_updated_changelog(existing_content, releases, packaging_changelog,
                               build_version):
    """Generate the full updated debian/changelog content.

    Combines new release entries, packaging entries, and existing content.
    """
    latest_existing, _, _ = parse_existing_changelog(existing_content)

    if latest_existing is None:
        latest_existing = "0.0.0"

    # Filter to only new releases
    new_releases = filter_new_releases(releases, latest_existing, build_version)

    if not new_releases and not packaging_changelog.strip():
        return existing_content

    # Generate release entries
    release_entries = generate_release_entries(new_releases)

    # Parse packaging entries and filter to only new ones
    pkg_entries = parse_packaging_changelog(packaging_changelog)
    latest_key = kolibri_version_key(latest_existing)
    pkg_entries = [
        e for e in pkg_entries
        if kolibri_version_key(e["version"]) > latest_key
        or (kolibri_version_key(e["version"]) == latest_key
            and e["ubuntu_revision"] > 1)
    ]

    # Interleave all new entries
    all_new = interleave_entries(release_entries, pkg_entries)

    if not all_new:
        return existing_content

    # Build final changelog: new entries + existing
    parts = [e["text"] for e in all_new]
    new_section = "\n".join(parts)

    return new_section + "\n" + existing_content


def main(debian_changelog_path, version_path, packaging_changelog_path):
    """Update debian/changelog from GitHub releases and top-level CHANGELOG."""
    with open(debian_changelog_path) as f:
        existing_content = f.read()

    with open(version_path) as f:
        build_version = f.read().strip()

    packaging_changelog = ""
    if os.path.exists(packaging_changelog_path):
        with open(packaging_changelog_path) as f:
            packaging_changelog = f.read()

    latest_existing, _, _ = parse_existing_changelog(existing_content)
    releases = fetch_github_releases(latest_existing=latest_existing)
    updated = generate_updated_changelog(
        existing_content=existing_content,
        releases=releases,
        packaging_changelog=packaging_changelog,
        build_version=build_version,
    )

    with open(debian_changelog_path, "w") as f:
        f.write(updated)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate updated debian/changelog from GitHub releases"
    )
    parser.add_argument(
        "--debian-changelog", default="debian/changelog",
        help="Path to debian/changelog (default: %(default)s)"
    )
    parser.add_argument(
        "--version-file", default="dist/VERSION",
        help="Path to VERSION file (default: %(default)s)"
    )
    parser.add_argument(
        "--packaging-changelog", default="CHANGELOG",
        help="Path to top-level CHANGELOG (default: %(default)s)"
    )
    args = parser.parse_args()
    main(args.debian_changelog, args.version_file, args.packaging_changelog)
