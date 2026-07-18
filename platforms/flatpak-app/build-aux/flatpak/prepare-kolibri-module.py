#!/usr/bin/env python3
"""Render build-aux/flatpak/modules/python3-kolibri.json from its .in template,
pointing the Kolibri wheel source at a wheel obtained from a URL or a local file.

The wheel is placed alongside the generated module manifest so flatpak-builder
copies it into the build dir as a local `file` source (no sha256 needed, no
double-download). Exactly one of --url / --file must be given; with neither,
the build cannot proceed (mirrors kolibri-app's `make get-whl` guard)."""
import argparse
import json
import os
import shutil
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

DOWNLOAD_TIMEOUT = int(os.environ.get("KOLIBRI_WHEEL_DOWNLOAD_TIMEOUT", "60"))

HERE = Path(__file__).resolve().parent
MODULES_DIR = HERE / "modules"
TEMPLATE = MODULES_DIR / "python3-kolibri.json.in"
OUTPUT = MODULES_DIR / "python3-kolibri.json"


def fetch_from_url(url: str) -> str:
    filename = Path(urlsplit(url).path).name
    if not filename.endswith(".whl"):
        raise SystemExit(f"URL does not point at a .whl file: {url}")
    dest = MODULES_DIR / filename
    print(f"Downloading {url} -> {dest}")
    with urllib.request.urlopen(url, timeout=DOWNLOAD_TIMEOUT) as response, open(
        dest, "wb"
    ) as out:
        shutil.copyfileobj(response, out)
    return filename


def copy_local(path: str) -> str:
    src = Path(path)
    if not src.is_file():
        raise SystemExit(f"Wheel file not found: {path}")
    if src.suffix != ".whl":
        raise SystemExit(f"Not a .whl file: {path}")
    dest = MODULES_DIR / src.name
    if src.resolve() != dest.resolve():
        shutil.copyfile(src, dest)
    return src.name


def render(wheel_filename: str) -> None:
    module = json.loads(TEMPLATE.read_text())
    module.setdefault("sources", [])
    module["sources"].insert(0, {"type": "file", "path": wheel_filename})
    OUTPUT.write_text(json.dumps(module, indent=4) + "\n")
    print(f"Wrote {OUTPUT} (wheel source: {wheel_filename})")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url", help="URL of the Kolibri wheel to download")
    group.add_argument("--file", help="Path to a local Kolibri wheel")
    args = parser.parse_args(argv)

    wheel_filename = fetch_from_url(args.url) if args.url else copy_local(args.file)
    render(wheel_filename)


if __name__ == "__main__":
    main()
