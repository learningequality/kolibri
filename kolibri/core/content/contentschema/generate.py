"""
Renders the frozen artifacts `generate_schema` writes for a content schema version.
"""

from pprint import pformat

from kolibri.core.content.contentschema import columns
from kolibri.core.content.contentschema import schema_ddl_path

COLUMNS_MODULE_TEMPLATE = '''"""
Frozen column map for content schema version {version}.

Written by `kolibri manage generate_schema` — do not edit by hand.
"""

COLUMNS = {columns}
'''

# A table's own definition first, then its indexes by name. SQLite gives autoindexes
# a null definition, which drops them here — they come back with the table.
TABLE_DDL_QUERY = """
    SELECT sql FROM sqlite_master
    WHERE tbl_name = %s AND sql IS NOT NULL
    ORDER BY type = 'index', name
"""


def columns_for_schema(connection, table_names):
    """
    The column map for a migrated schema, in the form `columns.for_version` returns.
    """
    with connection.cursor() as cursor:
        return {
            table: tuple(
                field.name
                for field in connection.introspection.get_table_description(
                    cursor, table
                )
            )
            for table in table_names
        }


def render_schema_ddl(connection, table_names):
    statements = []
    with connection.cursor() as cursor:
        for table in table_names:
            cursor.execute(TABLE_DDL_QUERY, [table])
            statements.extend(sql for (sql,) in cursor.fetchall())
    return "".join(statement.strip() + ";\n" for statement in statements)


def freeze_schema_version(version, connection, table_names):
    """
    Write both frozen artifacts, and return the column map written.
    """
    table_columns = columns_for_schema(connection, table_names)
    with open(columns.module_path(version), "w") as f:
        f.write(
            COLUMNS_MODULE_TEMPLATE.format(
                version=version, columns=pformat(table_columns)
            )
        )
    with open(schema_ddl_path(version), "w") as f:
        f.write(render_schema_ddl(connection, table_names))
    return table_columns
