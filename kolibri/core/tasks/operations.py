import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def _get_db_tables(schema_editor):
    with schema_editor.connection.cursor() as cursor:
        return [
            table.name
            for table in schema_editor.connection.introspection.get_table_list(cursor)
        ]


class CreateModelIfNotExists(migrations.CreateModel):
    """
    Migration operation that creates a model if it does not already exist in the database.
    This is useful for ensuring compatibility between SQLAlchemy and Django migrations,
    preventing errors when the model has already been created by SQLAlchemy.
    """

    def _model_exists(self, schema_editor, table_name):
        tables = _get_db_tables(schema_editor)
        return table_name in tables

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        to_model = to_state.apps.get_model(app_label, self.name)
        table_name = to_model._meta.db_table

        if not self._model_exists(schema_editor, table_name):
            # Let the parent class handle the creation
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        else:
            logger.info(f"Table '{table_name}' already exists. Skipping creation.")

    def describe(self):
        return f"Creates the model {self.name} if it does not exist."


class AddIndexIfNotExists(migrations.AddIndex):
    """
    Migration operation that adds an index to a model if it does not already exist in the database.
    This is useful for ensuring compatibility between SQLAlchemy and Django migrations,
    preventing errors when the index has already been added by SQLAlchemy.
    """

    def _index_exists(self, schema_editor, table_name, index_name):
        # Check existing tables in the database
        tables = _get_db_tables(schema_editor)
        if table_name not in tables:
            return False

        with schema_editor.connection.cursor() as cursor:
            # Get existing constraints (including indexes) on the table
            constraints = schema_editor.connection.introspection.get_constraints(
                cursor, table_name
            )
        return constraints.get(index_name) is not None

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        table_name = model._meta.db_table
        index_name = self.index.name

        if not self._index_exists(schema_editor, table_name, index_name):
            # Let the parent class handle the index creation
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        else:
            logger.info(f"Index '{index_name}' already exists. Skipping creation.")

    def describe(self):
        return f"Adds the index {self.index} to {self.model_name} if it does not exist."
