"""
Read-only introspection of a channel database file.

Channel databases are SQLite files exported by Studio at one of the historical
content schema versions. This reads one through `sqlite3` directly, and infers
its schema version by matching the shape it actually has against the frozen
column maps under `contentschema/columns/`.
"""

import sqlite3
from pathlib import Path

from django.utils.functional import cached_property

from kolibri.core.content.constants.schema_versions import CONTENT_DB_SCHEMA_VERSIONS
from kolibri.core.content.contentschema.columns import for_version
from kolibri.core.content.errors import SchemaNotFoundError


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

    def rows(self, table, columns=None):
        """
        Stream the table's rows as dicts, projected onto `columns` in that order
        when one is given.

        The table check is made here rather than inside the generator, so that a
        caller which never iterates still gets the error.
        """
        if table not in self._shape:
            raise ValueError("No table named {} in {}".format(table, self.path))
        selection = (
            "*"
            if columns is None
            else ", ".join('"{}"'.format(column) for column in columns)
        )
        cursor = self._connection.execute(
            'SELECT {} FROM "{}"'.format(selection, table)
        )
        return (dict(row) for row in cursor)

    @cached_property
    def schema_version(self):
        """
        The newest content schema version this file's shape satisfies.

        Studio publishes a database that is a superset of the oldest schema it
        declares itself readable by, keeping legacy columns alongside current ones,
        so this matches on superset rather than equality and ratchets down from the
        newest version until one fits.
        """
        declared = {table: frozenset(columns) for table, columns in self._shape.items()}
        for version in CONTENT_DB_SCHEMA_VERSIONS:
            if all(
                declared.get(table, frozenset()).issuperset(columns)
                for table, columns in for_version(version).items()
            ):
                return version
        raise SchemaNotFoundError(
            "No matching schema found for database {}".format(self.path)
        )
