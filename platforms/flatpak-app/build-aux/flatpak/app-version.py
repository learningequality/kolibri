#!/usr/bin/env python3
"""Print the app version derived from the installed Kolibri, or with --date
or --url the release date or release notes URL meson writes into the
metainfo <release>.

The app version is Kolibri's with the major bumped by 3, so Kolibri 0.19
sorts above 3.8, the last independently versioned release on Flathub. A
pre-release or dev suffix goes after "~", which AppStream sorts below the
final release; without it, 3.19.5b1 would sort above 3.19.5.
"""

import importlib.metadata
import os
import re
import sys
import time

MAJOR_OFFSET = 3
KOLIBRI_RELEASES_URL = "https://github.com/learningequality/kolibri/releases"


def app_version(kolibri_version: str) -> str:
    match = re.fullmatch(r"(\d+)((?:\.\d+)*)(.*)", kolibri_version)
    if match is None:
        raise SystemExit(f"Not a PEP 440 version: {kolibri_version}")
    major, rest, suffix = match.groups()
    release = f"{int(major) + MAJOR_OFFSET}{rest}"
    # Drop the PEP 440 dot so ".dev" becomes "~dev", not "~.dev".
    return f"{release}~{suffix.lstrip('.')}" if suffix else release


def release_url(kolibri_version: str) -> str:
    # Only final releases have a tag named after their PEP 440 version.
    if re.fullmatch(r"[\d.]+", kolibri_version):
        return f"{KOLIBRI_RELEASES_URL}/tag/v{kolibri_version}"
    return KOLIBRI_RELEASES_URL


def release_date() -> str:
    # flatpak-builder sets SOURCE_DATE_EPOCH for reproducible builds.
    epoch = int(os.environ.get("SOURCE_DATE_EPOCH", time.time()))
    return time.strftime("%Y-%m-%d", time.gmtime(epoch))


def main(argv: list[str]) -> None:
    if argv == ["--date"]:
        print(release_date())
        return
    # Package metadata, not `import kolibri`, which sets up Kolibri's env.
    kolibri_version = importlib.metadata.version("kolibri")
    if argv == ["--url"]:
        print(release_url(kolibri_version))
    else:
        print(app_version(kolibri_version))


if __name__ == "__main__":
    main(sys.argv[1:])
