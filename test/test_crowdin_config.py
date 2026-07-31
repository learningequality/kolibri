"""Project-wide invariants of crowdin.yml.

Both of these fail silently rather than loudly, which is why they are asserted here
rather than left to the comments in the file: a CSV `dest` that loses its literal
`.csv` uploads clean and parses to nothing, and a missing `dest` puts a file on a
path no translation is attached to.
"""

import os

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _config():
    # PyYAML rides in transitively via drf-yasg (gated to python_version >=
    # '3.8'); skip on the 3.6/3.7 no-uv CI where it isn't installed.
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(REPO_ROOT, "crowdin.yml")) as f:
        return yaml.safe_load(f)


def test_hierarchy_is_preserved():
    # The CLI silently drops every `dest` without this.
    assert _config()["preserve_hierarchy"] is True


def test_every_entry_has_a_dest():
    assert [e for e in _config()["files"] if not e.get("dest")] == []


def test_dest_extension_matches_source():
    # UploadSourcesAction.isSpreadsheet() extension-tests the unresolved `dest`, so a
    # CSV whose dest does not end in a literal `.csv` loses its scheme.
    for entry in _config()["files"]:
        source_ext = os.path.splitext(entry["source"])[1]
        assert os.path.splitext(entry["dest"])[1] == source_ext, entry["source"]


def test_dests_are_unique():
    dests = [e["dest"] for e in _config()["files"]]
    assert sorted(dests) == sorted(set(dests))
