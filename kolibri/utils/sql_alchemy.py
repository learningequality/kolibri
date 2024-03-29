# Modified from https://gist.github.com/miohtama/278fd4eeb9e5272d061c
from sqlalchemy import inspect
from sqlalchemy.orm import RelationshipProperty


class DBSchemaError(Exception):
    pass


def db_matches_schema(classes, engine):
    """
    Check whether the current database matches the models declared in model base.
    Currently we check that all tables exist with all columns.
    :param Base: Declarative Base for SQLAlchemy models to check
    :param session: SQLAlchemy session bound to an engine
    :return: True if all declared models have corresponding tables and columns.
    """

    iengine = inspect(engine)

    tables = iengine.get_table_names()

    # Go through all SQLAlchemy models
    for table, klass in classes.items():

        if table in tables:

            columns = [c["name"] for c in iengine.get_columns(table)]
            mapper = inspect(klass)

            for column_prop in mapper.attrs:
                if isinstance(column_prop, RelationshipProperty):
                    # TODO: Add sanity checks for relations
                    pass
                else:
                    for column in column_prop.columns:
                        # Assume normal flat column
                        if column.key not in columns:
                            raise DBSchemaError(
                                "Model %s declares column %s which does not exist in database %s",
                                klass,
                                column.key,
                                engine,
                            )
        else:
            raise DBSchemaError(
                "Model %s declares table %s which does not exist in database %s",
                klass,
                table,
                engine,
            )
