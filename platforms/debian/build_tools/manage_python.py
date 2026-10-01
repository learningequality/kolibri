#!/usr/bin/env python3
"""
Manage python-build-standalone tarballs for the Kolibri .deb package.

Subcommands:
    download [ARCH]     Download and verify tarballs for bundling.
    update VERSION      Find latest release for a Python version, download,
                        compute checksums, and update python_versions.env.
"""

import argparse
import hashlib
import json
import os
import re
import tempfile
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CONFIG_PATH = SCRIPT_DIR / "python_versions.env"
BUILD_SRC_DIR = REPO_ROOT / "build_src"

GITHUB_RELEASES_URL = (
    "https://api.github.com/repos/astral-sh/python-build-standalone/releases"
)
DOWNLOAD_URL_BASE = (
    "https://github.com/astral-sh/python-build-standalone/releases/download"
)

SUPPORTED_ARCHES = ("x86_64", "aarch64")

# python_versions.env is sourced by install-python.sh as root, so the two fields
# that come from upstream release metadata are held to a shell-inert shape.
TAG_RE = re.compile(r"[A-Za-z0-9._-]+")
FULL_VERSION_RE = re.compile(r"[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+")


# ---------------------------------------------------------------------------
# Config (.env) read/write
# ---------------------------------------------------------------------------


def read_config(path=CONFIG_PATH):
    """Parse a KEY="value" env file into a dict."""
    config = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key, _, value = line.partition("=")
            config[key.strip()] = value.strip().strip('"')
    return config


def write_config(path, values):
    """Write a python_versions.env file with the given values."""
    with open(path, "w") as f:
        f.write(
            """\
# Python version configuration for kolibri-installer-debian
# This file is sourced by build and install scripts.
#
# To update, run: make update-python VERSION=3.xx
# Or manually update all fields below.

PYTHON_VERSION="{PYTHON_VERSION}"
PYTHON_BUILD_STANDALONE_TAG="{PYTHON_BUILD_STANDALONE_TAG}"
PYTHON_BUILD_STANDALONE_VERSION="{PYTHON_BUILD_STANDALONE_VERSION}"
PYTHON_SHA256_X86_64="{PYTHON_SHA256_X86_64}"
PYTHON_SHA256_AARCH64="{PYTHON_SHA256_AARCH64}"
PYTHON_URL_BASE="{PYTHON_URL_BASE}"

# Minimum Python version required by Kolibri.
# If the system Python is >= this version, the bundled Python is not installed.
PYTHON_MIN_MAJOR={PYTHON_MIN_MAJOR}
PYTHON_MIN_MINOR={PYTHON_MIN_MINOR}
""".format(**values)
        )


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def tarball_filename(version, arch):
    return f"cpython-{version}-{arch}-unknown-linux-gnu-install_only_stripped.tar.gz"


def tarball_url(base, tag, version, arch):
    filename = tarball_filename(version, arch)
    # The + in the version must be URL-encoded as %2B
    url_filename = filename.replace("+", "%2B")
    return f"{base}/{tag}/{url_filename}"


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def check_floor(config):
    bundled = config["PYTHON_VERSION"]
    floor = (int(config["PYTHON_MIN_MAJOR"]), int(config["PYTHON_MIN_MINOR"]))
    if tuple(int(p) for p in bundled.split(".")[:2]) < floor:
        raise SystemExit(
            f"ERROR: bundled Python {bundled} is below the declared floor "
            f"{floor[0]}.{floor[1]}"
        )


def verify_sha256(path, expected):
    actual = sha256_file(path)
    if actual != expected:
        raise SystemExit(
            f"ERROR: SHA256 mismatch for {path}\n"
            f"  Expected: {expected}\n"
            f"  Got:      {actual}"
        )
    return actual


def download_file(url, dest):
    """Download url to dest with progress indication."""
    print(f"Downloading {dest.name}...")

    def report(block, block_size, total):
        done = block * block_size
        if total > 0:
            pct = min(100, done * 100 // total)
            print(f"\r  {pct}%  ({done // (1 << 20)} / {total // (1 << 20)} MB)", end="", flush=True)

    # urlretrieve leaves a truncated file behind at its destination when the
    # transfer fails, which a later run reads back as a complete download.
    fd, tmp_name = tempfile.mkstemp(
        dir=str(dest.parent), prefix=f".{dest.name}.", suffix=".part"
    )
    os.close(fd)
    os.chmod(tmp_name, 0o644)
    try:
        urllib.request.urlretrieve(url, tmp_name, reporthook=report)
        print()
        os.replace(tmp_name, dest)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise


# ---------------------------------------------------------------------------
# download subcommand
# ---------------------------------------------------------------------------


def download(arches, config_path=CONFIG_PATH, dest_dir=BUILD_SRC_DIR):
    config = read_config(config_path)
    check_floor(config)
    version = config["PYTHON_BUILD_STANDALONE_VERSION"]
    base = config["PYTHON_URL_BASE"]
    tag = config["PYTHON_BUILD_STANDALONE_TAG"]

    dest_dir.mkdir(exist_ok=True)

    for arch in arches:
        sha_key = f"PYTHON_SHA256_{arch.upper()}"
        expected_sha = config.get(sha_key)
        if not expected_sha:
            raise SystemExit(f"ERROR: {sha_key} is not set in python_versions.env")

        filename = tarball_filename(version, arch)
        dest = dest_dir / filename
        url = tarball_url(base, tag, version, arch)

        if dest.exists():
            print(f"Already downloaded: {dest}")
            actual = sha256_file(dest)
            if actual == expected_sha:
                print("Checksum verified.")
                continue
            else:
                print("Checksum mismatch, re-downloading...")
                dest.unlink()

        download_file(url, dest)

        try:
            verify_sha256(dest, expected_sha)
        except SystemExit:
            dest.unlink(missing_ok=True)
            raise
        print("Checksum verified.")

    print("Done.")


# ---------------------------------------------------------------------------
# update subcommand
# ---------------------------------------------------------------------------


def find_release(releases, target):
    """Find the latest release with matching tarballs for target Python version."""
    suffix = "-unknown-linux-gnu-install_only_stripped.tar.gz"
    # Anchor on the trailing dot: without it "3.1" matches "cpython-3.10.20+...".
    prefix = f"cpython-{target}."
    for r in releases:
        if r.get("draft") or r.get("prerelease"):
            continue
        assets = {a["name"]: a["browser_download_url"] for a in r.get("assets", [])}
        urls = {}
        names = {}
        for arch in SUPPORTED_ARCHES:
            for name, url in assets.items():
                if name.startswith(prefix) and name.endswith(f"-{arch}{suffix}"):
                    urls[arch] = url
                    names[arch] = name
                    break
        if len(urls) != len(SUPPORTED_ARCHES):
            continue
        # Extract version from the matched filename, e.g. "3.10.20+20260325"
        full_version = names[SUPPORTED_ARCHES[0]].split("-")[1]
        python_version = full_version.split("+")[0]
        return r["tag_name"], python_version, full_version, urls

    return None


def updated_config(existing, tag, python_version, full_version, target_minor):
    """Build new config values, keeping the supported floor from `existing`."""
    if not TAG_RE.fullmatch(tag):
        raise SystemExit(f"ERROR: refusing to write release tag: {tag!r}")
    if not FULL_VERSION_RE.fullmatch(full_version):
        raise SystemExit(f"ERROR: refusing to write build version: {full_version!r}")
    values = {
        "PYTHON_VERSION": python_version,
        "PYTHON_BUILD_STANDALONE_TAG": tag,
        "PYTHON_BUILD_STANDALONE_VERSION": full_version,
        "PYTHON_SHA256_X86_64": "",
        "PYTHON_SHA256_AARCH64": "",
        "PYTHON_URL_BASE": DOWNLOAD_URL_BASE,
        "PYTHON_MIN_MAJOR": existing.get("PYTHON_MIN_MAJOR", "3"),
        "PYTHON_MIN_MINOR": existing.get("PYTHON_MIN_MINOR", target_minor),
    }
    check_floor(values)
    return values


def cmd_update(args):
    target = args.version

    # Normalize: "11" -> "3.11"
    if re.match(r"^\d+$", target):
        target = f"3.{target}"

    if not re.match(r"^3\.\d+$", target):
        raise SystemExit(f"ERROR: Version must be in format 3.XX (e.g. 3.11), got: {target}")

    print(f"Searching for latest python-build-standalone release with cpython-{target}...")

    url = f"{GITHUB_RELEASES_URL}?per_page=20"
    with urllib.request.urlopen(url) as resp:
        releases = json.load(resp)

    result = find_release(releases, target)
    if result is None:
        raise SystemExit(
            f"ERROR: Could not find a python-build-standalone release with cpython-{target}"
        )

    tag, python_version, full_version, urls = result
    print(f"Found: Python {python_version} ({full_version}) in release {tag}")
    for arch, u in urls.items():
        print(f"  {arch}: {u}")

    existing = read_config() if CONFIG_PATH.exists() else {}
    values = updated_config(
        existing, tag, python_version, full_version, target.split(".")[1]
    )

    # Download into build_src/ so `make get-python` doesn't re-fetch the same
    # tarballs — once update completes, the checksums in python_versions.env
    # will match the files already on disk.
    BUILD_SRC_DIR.mkdir(exist_ok=True)

    for arch in SUPPORTED_ARCHES:
        dest = BUILD_SRC_DIR / tarball_filename(full_version, arch)
        if dest.exists():
            print(f"Already downloaded: {dest}")
        else:
            download_file(urls[arch], dest)
        checksum = sha256_file(dest)
        values[f"PYTHON_SHA256_{arch.upper()}"] = checksum
        print(f"SHA256 {arch}: {checksum}")

    write_config(CONFIG_PATH, values)

    print(f"\nUpdated {CONFIG_PATH}")
    print("Review the changes, then commit.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Manage python-build-standalone tarballs for the Kolibri .deb."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    dl = sub.add_parser("download", help="Download and verify tarballs for bundling.")
    dl.add_argument(
        "arch",
        nargs="?",
        choices=SUPPORTED_ARCHES,
        help="Download only this architecture (default: both).",
    )

    up = sub.add_parser(
        "update",
        help="Find latest release, download, compute checksums, update config.",
    )
    up.add_argument("version", help="Target Python version, e.g. 3.11 or just 11.")

    args = parser.parse_args()
    if args.command == "download":
        download([args.arch] if args.arch else list(SUPPORTED_ARCHES))
    elif args.command == "update":
        cmd_update(args)


if __name__ == "__main__":
    main()
