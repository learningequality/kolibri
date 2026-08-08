"""
Read-only introspection of a channel database file.

Channel databases are SQLite files exported by Studio at one of the historical
content schema versions. This reads one through `sqlite3` directly, and infers
its schema version by matching the shape it actually has against the frozen
column maps under `contentschema/columns/`.
"""

import sqlite3
from functools import lru_cache
from pathlib import Path

from django.utils.functional import cached_property

from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.errors import SchemaNotFoundError


@lru_cache(maxsize=None)
def _versions_by_specificity():
    """
    The schema versions ordered by declared column count, most first, so the first
    version a file satisfies is its most specific match.

    Schema 3 dropped ContentNode.stemmed_metaphone and File.available, so every version
    2 database also satisfies version 3 — the container has to be tried first.
    """
    return sorted(
        CONTENT_DB_SCHEMA_VERSIONS,
        key=lambda version: -sum(map(len, for_version(version).values())),
    )


class SourceDB:
    """
    A channel database file, opened read-only.

    An absent or unreadable file raises `sqlite3.OperationalError` from the
    constructor; a corrupt one opens cleanly and raises `sqlite3.DatabaseError` on
    the first query instead.
    """

    def __init__(self, path):
        self.path = path
        self._connection = sqlite3.connect(
            "{}?mode=ro".format(Path(path).absolute().as_uri()), uri=True
        )
        self._connection.row_factory = sqlite3.Row

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()

    def close(self):
        self._connection.close()

    @cached_property
    def _shape(self):
        """
        Every table in this file mapped to its column names, in declaration order.
        """
        names = [
            row["name"]
            for row in self._connection.execute(
                # An AUTOINCREMENT primary key gives the file a sqlite_sequence
                # table, which is bookkeeping rather than schema.
                "SELECT name FROM sqlite_master"
                " WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        ]
        return {
            name: [
                row["name"]
                for row in self._connection.execute(
                    'PRAGMA table_info("{}")'.format(name)
                )
            ]
            for name in names
        }

    def tables(self):
        return set(self._shape)

    def columns(self, table):
        """
        The table's column names in declaration order, or an empty list if the
        table is not in this file.
        """
        return self._shape.get(table, [])

    def rows(self, table):
        if table not in self._shape:
            raise ValueError("No table named {} in {}".format(table, self.path))
        return [
            dict(row)
            for row in self._connection.execute('SELECT * FROM "{}"'.format(table))
        ]

    @cached_property
    def schema_version(self):
        """
        The content schema version this file's shape corresponds to. A file may declare
        more than its own version does, as a Studio export does, so this matches on
        superset rather than equality.
        """
        declared = {table: frozenset(columns) for table, columns in self._shape.items()}
        for version in _versions_by_specificity():
            if all(
                declared.get(table, frozenset()).issuperset(columns)
                for table, columns in for_version(version).items()
            ):
                return version
        raise SchemaNotFoundError(
            "No matching schema found for database {}".format(self.path)
        )
