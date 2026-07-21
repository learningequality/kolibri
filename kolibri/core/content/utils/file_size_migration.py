"""
Shared LocalFile.file_size (32-bit) -> file_size_bigint (64-bit) migration
helpers, used by both the 0048 migration (fresh installs) and the
migrate_file_size_to_bigint upgrade task (existing installs) so the drop logic
isn't duplicated across the two.
"""


def localfile_columns(connection):
    """Return the set of column names currently on content_localfile."""
    with connection.cursor() as cursor:
        return {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, "content_localfile"
            )
        }


def drop_legacy_file_size_column(schema_editor, model):
    """
    Drop the legacy 32-bit file_size column.

    On SQLite (including versions < 3.35 that lack native DROP COLUMN) this
    rebuilds the table from the current model state via Django's own
    _remake_table, which omits the physical file_size column; on other
    backends it issues a native DROP COLUMN.
    """
    if schema_editor.connection.vendor == "sqlite":
        schema_editor._remake_table(model)
    else:
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("ALTER TABLE content_localfile DROP COLUMN file_size")
