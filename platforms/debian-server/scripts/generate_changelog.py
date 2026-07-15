#!/usr/bin/env python3
"""Generate debian/changelog with a version derived from Kolibri's version.

The .deb version is bound to the Kolibri version, replacing the old independent
0.5.x scheme. Kolibri uses PEP 440 versions (``0.19.0``, ``0.19.0b1``,
``0.19.0.dev0+gitXXXX``), which are not valid Debian versions and do not sort
correctly, so we convert them the same way kolibri-installer-debian converts
Kolibri's own .deb: a pre-release or dev segment gains a leading ``~`` so it
sorts *before* the corresponding final release.

Version source (two contexts, one authoritative source per context):
  * PR build: the caller passes ``KOLIBRI_VERSION`` parsed from the whl job's
    ``kolibri-<version>.tar.gz`` artifact — the version actually built.
  * release / local: no tar exists, so we fall back to ``import kolibri``.
"""

import argparse
import os
import re
from email.utils import formatdate

PACKAGE = "kolibri-server"
# Default target series; the release path overrides it with the runner's series
# (via --distribution / $DISTRIBUTION) so the source upload targets that series.
DEFAULT_DISTRIBUTION = "jammy"
URGENCY = "medium"
# The old changelog used the Debian-native ``-0ubuntuN`` revision form
# (``0.5.1-0ubuntu1``); keep it so the version stays a monotonic upgrade.
DEBIAN_REVISION = "0ubuntu1"


def debian_upstream_version(version):
    """Convert a PEP 440 version to a Debian-sortable upstream version.

    In Debian version comparison a missing part sorts before any present part
    *except* ``~``, so a PEP 440 pre-release (``0.19.0b1``) or dev/local build
    (``0.19.0.dev0+gitXXXX``) must be prefixed with ``~`` to sort before the
    final ``0.19.0``.
    """
    release, suffix = re.match(r"^(\d+(?:\.\d+)*)(.*)$", version).groups()
    if not suffix:
        return release
    # Drop the PEP 440 dot separator so ``.dev`` becomes ``~dev``, not ``~.dev``.
    return "{}~{}".format(release, suffix.lstrip("."))


def debian_version(version):
    """Full Debian version for the .deb: upstream version + Ubuntu revision."""
    return "{}-{}".format(debian_upstream_version(version), DEBIAN_REVISION)


def kolibri_version():
    """Resolve the workspace Kolibri version (release / local fallback)."""
    import kolibri

    return kolibri.__version__


def render_changelog(deb_version, distribution, author, date):
    """Render a single, dpkg-parseable changelog entry."""
    return (
        "{package} ({version}) {distribution}; urgency={urgency}\n"
        "\n"
        "  * Release {version}, generated from the Kolibri version.\n"
        "\n"
        " -- {author}  {date}\n"
    ).format(
        package=PACKAGE,
        version=deb_version,
        distribution=distribution,
        urgency=URGENCY,
        author=author,
        date=date,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--kolibri-version",
        default=os.environ.get("KOLIBRI_VERSION"),
        help="Kolibri PEP 440 version to bind to (defaults to $KOLIBRI_VERSION, "
        "then to the installed kolibri).",
    )
    parser.add_argument(
        "--distribution",
        default=os.environ.get("DISTRIBUTION") or DEFAULT_DISTRIBUTION,
        help="Target Debian/Ubuntu series (defaults to $DISTRIBUTION, then "
        "'{}').".format(DEFAULT_DISTRIBUTION),
    )
    args = parser.parse_args()

    version = args.kolibri_version or kolibri_version()
    author = "{} <{}>".format(
        os.environ.get("DEBFULLNAME", "Learning Equality"),
        os.environ.get("DEBEMAIL", "accounts@learningequality.org"),
    )
    date = formatdate(localtime=True)
    with open(os.path.join("debian", "changelog"), "w") as changelog:
        changelog.write(
            render_changelog(debian_version(version), args.distribution, author, date)
        )


if __name__ == "__main__":
    main()
