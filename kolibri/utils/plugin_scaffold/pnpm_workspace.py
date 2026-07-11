"""
pnpm-workspace resolution for the scaffolded ``package.json``.

A scaffolded frontend plugin may live inside Kolibri's pnpm workspace (where
``workspace:*``/``catalog:`` dependency specifiers resolve) or outside it (where
those specifiers are meaningless and a concrete version is required). This
module mirrors the enclosing-``pyproject.toml`` resolution in ``entrypoint.py``:
it walks up from the target directory to the nearest ``pnpm-workspace.yaml`` and
reports which dependency names that workspace can actually satisfy — as a
workspace member or a catalog entry — so the orchestrator can pick the right
specifier per dependency and fall back to a pinned version otherwise.

``pnpm-workspace.yaml`` is parsed by a small line reader rather than a YAML
library: PyYAML is not a Kolibri runtime dependency, and the two blocks the
scaffolder needs (``packages:`` globs and the ``catalog:`` keys) have a stable,
shallow structure.
"""

import glob
import io
import json
import os

from kolibri.utils.plugin_scaffold.entrypoint import find_enclosing_file
from kolibri.utils.plugin_scaffold.entrypoint import unquote

WORKSPACE_FILE = "pnpm-workspace.yaml"


def _parse_workspace(workspace_path):
    """
    Read the ``packages:`` globs and ``catalog:`` keys from the workspace file.

    A focused reader for the two top-level blocks the scaffolder needs. Blocks
    are keyed by their unindented ``name:`` line; ``packages:`` holds ``- glob``
    list items and ``catalog:`` holds ``name: version`` entries.

    :returns: a ``(packages_globs, catalog_names)`` tuple.
    """
    packages = []
    catalog = set()
    section = None
    with io.open(workspace_path, encoding="utf-8") as f:
        for raw in f:
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not raw[:1].isspace():
                # A new top-level key resets the current section.
                section = stripped.split(":", 1)[0].strip()
            elif section == "packages" and stripped.startswith("-"):
                glob_pattern = unquote(stripped[1:].strip())
                if glob_pattern:
                    packages.append(glob_pattern)
            elif section == "catalog":
                name = unquote(stripped.split(":", 1)[0].strip())
                if name:
                    catalog.add(name)
    return packages, catalog


def _member_names(root, packages):
    """
    The set of package names provided as members of the workspace.

    Resolves each ``packages:`` glob relative to the workspace ``root`` and reads
    the ``name`` of every member ``package.json`` found.
    """
    names = set()
    for pattern in packages:
        for pkg_dir in glob.glob(os.path.join(root, pattern)):
            name = _package_name(os.path.join(pkg_dir, "package.json"))
            if name:
                names.add(name)
    return names


def _package_name(pkg_json_path):
    if not os.path.isfile(pkg_json_path):
        return None
    with io.open(pkg_json_path, encoding="utf-8") as f:
        try:
            return json.load(f).get("name")
        except ValueError:
            return None


def resolve_dependencies(fallbacks, target_dir):
    """
    Choose a specifier for each frontend dependency given the target location.

    Inside an enclosing pnpm workspace, a dependency provided as a workspace
    member resolves to ``workspace:*`` and one declared in the catalog resolves
    to ``catalog:``. Any dependency the workspace does not provide — or every
    dependency, when there is no enclosing workspace — falls back to its pinned
    version from ``fallbacks``.

    :param fallbacks: a mapping of dependency name to pinned version string.
    :param target_dir: the parent directory the plugin is scaffolded into.
    :returns: a mapping of dependency name to resolved specifier, ordered as
        ``fallbacks``.
    """
    workspace = find_enclosing_file(target_dir, WORKSPACE_FILE)
    members = set()
    catalog = set()
    if workspace:
        packages, catalog = _parse_workspace(workspace)
        members = _member_names(os.path.dirname(workspace), packages)
    resolved = {}
    for name, pinned in fallbacks.items():
        if name in members:
            resolved[name] = "workspace:*"
        elif name in catalog:
            resolved[name] = "catalog:"
        else:
            resolved[name] = pinned
    return resolved
