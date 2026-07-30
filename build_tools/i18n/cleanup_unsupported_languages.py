#!/usr/bin/env python
"""
Remove locale directories for languages not in language_info.json.

This script should be run after downloading translations from Crowdin to clean up
any languages that were downloaded but are not officially supported by Kolibri.
A `languages_mapping` in crowdin.yml only renames codes, it does not filter, so
Crowdin delivers every language enabled on the project into every tree we sync.
"""

import glob
import logging
import os
import re
import shutil

from build_tools.i18n.generate_mapping import get_android_language_mapping
from build_tools.i18n.generate_mapping import get_installer_language_mapping
from build_tools.i18n.generate_mapping import get_language_mapping

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# `values-` prefixes every Android resource qualifier, not just locales, so match the
# shape of a locale one — `fr`, `fr-rFR` or BCP-47 `b+es+419` — and leave the rest
# (values-night, values-v21, values-sw600dp) alone. `car` and `tv` are the UI-mode
# qualifiers short enough to also be shaped like a language code (both are real ISO 639
# codes), so they are denied outright: in a res/ directory they are never a locale.
ANDROID_LOCALE_QUALIFIER = re.compile(
    r"^values-(?!(?:car|tv)$)(b\+[a-z]{2,3}(?:\+[A-Za-z0-9]+)*|[a-z]{2,3}(?:-r[A-Z]{2})?)$"
)

# Non-hidden build output that recursive discovery would otherwise walk into: p4a
# unpacks a full CPython under android_root/, and an unpacked Kolibri tar or a
# PyInstaller/sdist staging tree holds catalogs we do not own. glob already skips
# dot-prefixed directories, so .venv/ needs no entry.
EXCLUDED_DIR_NAMES = frozenset(
    {
        "node_modules",
        "site-packages",
        "android_root",
        "build",
        "dist",
        "tar",
    }
)


def _supported_locale_names():
    """Every locale directory name any of our sync targets may legitimately use.

    A directory's path does not reveal which convention its tree follows — the
    desktop-app installer keys folders by hyphen-lowercase intl codes (es-es) while
    everything gettext-based uses Django codes (es_ES) — so plain locale directories
    are pruned against the union. Only unsupported *languages* are being removed
    here; a code in the wrong convention for its tree is a different problem.
    """
    return set(get_language_mapping().values()) | set(
        get_installer_language_mapping().values()
    )


def prune_locale_dirs(directory, supported_names, pattern=None):
    """Remove immediate subdirectories of `directory` for unsupported languages.

    `pattern` is a compiled regex whose first group extracts the locale name from a
    subdirectory name; a name it does not match is not a locale directory and is left
    alone. Without one, the subdirectory name is the locale name. Returns the sorted
    names of what was removed.
    """
    if not os.path.isdir(directory):
        return []

    removed = []
    for item in sorted(os.listdir(directory)):
        item_path = os.path.join(directory, item)

        if not os.path.isdir(item_path):
            continue

        if pattern is None:
            locale_name = item
        else:
            match = pattern.match(item)
            if match is None:
                continue
            locale_name = match.group(1)

        if locale_name not in supported_names:
            shutil.rmtree(item_path)
            removed.append(item)

    return removed


def _is_excluded(path, repo_root):
    # Relative to the root: a checkout under ~/build/kolibri must not exclude everything.
    parts = os.path.relpath(path, repo_root).split(os.sep)
    return any(
        part in EXCLUDED_DIR_NAMES or part.endswith(".egg-info") for part in parts
    )


def _locale_roots(repo_root):
    """Directories named locale/ or locales/, holding one subdirectory per language."""
    yield os.path.join(repo_root, "kolibri", "locale")

    for top in ("python_packages", "platforms"):
        for name in ("locale", "locales"):
            for path in glob.glob(
                os.path.join(repo_root, top, "**", name), recursive=True
            ):
                # Vendored dependencies and staged build output ship their own
                # catalogs; not ours to prune.
                if _is_excluded(path, repo_root):
                    continue
                yield path


def _android_res_roots(repo_root):
    """Android res/ directories, identified by their untranslated values/ folder."""
    for path in glob.glob(
        os.path.join(repo_root, "platforms", "**", "res", "values"), recursive=True
    ):
        if _is_excluded(path, repo_root):
            continue
        yield os.path.dirname(path)


def cleanup_targets(repo_root=REPO_ROOT):
    """Yield (directory, supported_names, pattern) for every tree Crowdin writes to."""
    supported = _supported_locale_names()
    for directory in _locale_roots(repo_root):
        yield directory, supported, None

    android_supported = set(get_android_language_mapping().values())
    for directory in _android_res_roots(repo_root):
        yield directory, android_supported, ANDROID_LOCALE_QUALIFIER


def cleanup_unsupported_languages(repo_root=REPO_ROOT):
    """
    Remove locale directories that are not in our supported languages list.
    """
    removed_locales = []
    for directory, supported_names, pattern in cleanup_targets(repo_root):
        for name in prune_locale_dirs(directory, supported_names, pattern):
            removed_locales.append(
                os.path.join(os.path.relpath(directory, repo_root), name)
            )

    if removed_locales:
        logging.info(
            f"Removed unsupported language directories: {', '.join(sorted(removed_locales))}"
        )
    else:
        logging.info("No unsupported language directories found")


if __name__ == "__main__":
    cleanup_unsupported_languages()
