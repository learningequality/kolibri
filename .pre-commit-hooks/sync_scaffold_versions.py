#!/usr/bin/env python3
"""
Pre-commit hook to keep the plugin scaffolder's fallback version pins in sync.

``kolibri/utils/plugin_scaffold/manifest.py`` declares ``FRONTEND_DEPENDENCIES``
— pinned versions used for a scaffolded ``package.json`` when the plugin is NOT
inside a pnpm workspace that provides the dependency (see the note there). Those
pins mirror the versions Kolibri currently ships, so they go stale whenever a
workspace member is bumped or a catalog entry changes.

This hook recomputes each pin from the source of truth — a member package's own
``package.json`` version, or the ``catalog:`` entry in ``pnpm-workspace.yaml`` —
and rewrites ``manifest.py`` in place. Like other formatting hooks, it exits
non-zero when it changes the file so the developer re-stages it.
"""

import glob
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE_FILE = os.path.join(ROOT, "pnpm-workspace.yaml")
MANIFEST_FILE = os.path.join(ROOT, "kolibri", "utils", "plugin_scaffold", "manifest.py")


def _unquote(text):
    if len(text) >= 2 and text[0] in "\"'" and text[-1] == text[0]:
        return text[1:-1]
    return text


def _pin(version):
    """Normalise a version specifier to a caret pin (``^1.2.3``)."""
    return "^" + re.sub(r"^[^0-9]*", "", version.strip())


def _parse_workspace(path):
    """Read ``packages:`` globs and ``catalog:`` name->version from the workspace."""
    packages = []
    catalog = {}
    section = None
    with io.open(path, encoding="utf-8") as f:
        for raw in f:
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not raw[:1].isspace():
                section = stripped.split(":", 1)[0].strip()
            elif section == "packages" and stripped.startswith("-"):
                pattern = _unquote(stripped[1:].strip())
                if pattern:
                    packages.append(pattern)
            elif section == "catalog":
                key, _, value = stripped.partition(":")
                name = _unquote(key.strip())
                if name and value.strip():
                    catalog[name] = _unquote(value.strip())
    return packages, catalog


def _member_versions(packages):
    """Map each workspace member package name to its declared version."""
    versions = {}
    for pattern in packages:
        for pkg_dir in glob.glob(os.path.join(ROOT, pattern)):
            pkg_json = os.path.join(pkg_dir, "package.json")
            if not os.path.isfile(pkg_json):
                continue
            with io.open(pkg_json, encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except ValueError:
                    continue
            name, version = data.get("name"), data.get("version")
            if name and version:
                versions[name] = version
    return versions


def _resolved_pins():
    """The expected fallback pin for every dependency the workspace provides."""
    packages, catalog = _parse_workspace(WORKSPACE_FILE)
    # Member versions win over catalog: a name is provided as one or the other,
    # and a member's own package.json is the authoritative version for it.
    pins = {name: _pin(v) for name, v in catalog.items()}
    pins.update({name: _pin(v) for name, v in _member_versions(packages).items()})
    return pins


def sync():
    pins = _resolved_pins()
    with io.open(MANIFEST_FILE, encoding="utf-8") as f:
        text = f.read()

    # FRONTEND_DEPENDENCIES is the only ``"name": "spec"`` mapping in the file
    # (SURFACES uses ``FileSpec(...)`` calls), and it is the last statement, so
    # substituting from its start to end of file touches only dependency pins.
    start = text.index("FRONTEND_DEPENDENCIES")

    def replace(match):
        name, spec = match.group(1), match.group(2)
        want = pins.get(name)
        if want and spec != want:
            return '"{}": "{}"'.format(name, want)
        return match.group(0)

    updated = text[:start] + re.sub(
        r'"([A-Za-z0-9@/._-]+)":\s*"([^"]*)"', replace, text[start:]
    )
    if updated == text:
        return 0

    with io.open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        f.write(updated)
    sys.stderr.write(
        "Updated scaffolder fallback version pins in {} to match the pnpm "
        "workspace/catalog. Review and re-stage the change.\n".format(
            os.path.relpath(MANIFEST_FILE, ROOT)
        )
    )
    return 1


if __name__ == "__main__":
    sys.exit(sync())
