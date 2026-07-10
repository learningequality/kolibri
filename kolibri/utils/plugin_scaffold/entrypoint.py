"""
Entry-point registration for module-mode plugins.

A module-mode plugin is not its own distribution, so its
``kolibri.plugins`` entry point must be inserted into the nearest
enclosing ``pyproject.toml``. The insertion is text-based (not via a TOML
library) to preserve comments and formatting and to stay dependency-free
on the Python 3.6 floor, where ``tomllib`` is unavailable.

Package-mode plugins declare their own entry point via a rendered
``pyproject.toml`` template, so this module is module-mode logic only.
"""

import io
import os

ENTRY_POINT_HEADER = '[project.entry-points."kolibri.plugins"]'


def unquote(text):
    """Strip a matching pair of surrounding single or double quotes, if any."""
    if len(text) >= 2 and text[0] in "\"'" and text[-1] == text[0]:
        return text[1:-1]
    return text


def find_enclosing_file(start_dir, filename):
    """
    Walk parents upward from ``start_dir`` to the nearest ``filename``.

    :param start_dir: the directory to start searching from.
    :param filename: the file name to look for at each level.
    :returns: the path of the first enclosing file named ``filename``, or
        ``None`` if none is found before the filesystem root.
    """
    current = os.path.abspath(start_dir)
    while True:
        candidate = os.path.join(current, filename)
        if os.path.isfile(candidate):
            return candidate
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def find_enclosing_pyproject(start_dir):
    """Walk parents upward from ``start_dir`` to the nearest ``pyproject.toml``."""
    return find_enclosing_file(start_dir, "pyproject.toml")


def module_import_path(module_dir, pyproject_dir):
    """
    Dotted import path of ``module_dir`` relative to ``pyproject_dir``.

    E.g. ``<pp>/my_thing`` -> ``"my_thing"``;
    ``<pp>/kolibri/plugins/my_thing`` -> ``"kolibri.plugins.my_thing"``.
    """
    rel = os.path.relpath(module_dir, pyproject_dir)
    return ".".join(rel.split(os.sep))


def insert_entry_point(pyproject_path, name):
    """
    Insert a ``kolibri.plugins`` entry point into ``pyproject_path``.

    The line ``"<name>" = "<name>"`` is placed at its sorted position
    within the ``[project.entry-points."kolibri.plugins"]`` table, without
    reordering existing entries.

    :returns: ``True`` if inserted, ``False`` if ``name`` is already
        present (idempotent).
    :raises LookupError: if the entry-point table header is absent.
    """
    with io.open(pyproject_path, encoding="utf-8", newline="") as f:
        content = f.read()
    newline = "\r\n" if "\r\n" in content else "\n"
    lines = content.splitlines()

    header_index = _find_header_index(lines)
    if header_index is None:
        raise LookupError(
            "No {} table in {}".format(ENTRY_POINT_HEADER, pyproject_path)
        )

    # Scan the contiguous entry lines following the header, up to the next
    # blank line or table header, tracking the sorted insertion point and
    # short-circuiting if ``name`` is already present.
    end_index = len(lines)
    insert_at = None
    for i in range(header_index + 1, len(lines)):
        stripped = lines[i].strip()
        if not stripped or stripped.startswith("["):
            end_index = i
            break
        key = _entry_key(lines[i])
        if key == name:
            return False
        if insert_at is None and key is not None and key > name:
            insert_at = i
    if insert_at is None:
        insert_at = end_index

    lines.insert(insert_at, '"{name}" = "{name}"'.format(name=name))
    with io.open(pyproject_path, "w", encoding="utf-8", newline="") as f:
        f.write(newline.join(lines) + newline)
    return True


def _find_header_index(lines):
    for i, line in enumerate(lines):
        if line.strip() == ENTRY_POINT_HEADER:
            return i
    return None


def _entry_key(line):
    """
    Extract the key from an entry line, unquoting it if quoted.

    Handles double-quoted (``"foo" = "bar"``), single-quoted, and bare
    (``foo = "bar"``) TOML keys. Returns ``None`` for blank lines,
    comments, and any line without a ``=`` assignment.
    """
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None
    return unquote(stripped.split("=", 1)[0].strip())
