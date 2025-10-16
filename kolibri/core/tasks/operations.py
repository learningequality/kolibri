import logging

from django.db import migrations

logger = logging.getLogger(__name__)


class AddFieldIfNotExists(migrations.AddField):
    """
    Migration operation that adds a field to a model if it does not already exist in the database.
    This is useful for ensuring compatibility between SQLAlchemy and Django migrations,
    preventing errors when the field has already been added by SQLAlchemy.
    """

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        """
        Executes the real logic in the database.
        """
        to_model = to_state.apps.get_model(app_label, self.model_name)

        from_model = from_state.apps.get_model(app_label, self.model_name)

        table_name = from_model._meta.db_table
        field = to_model._meta.get_field(self.name)
        column_name = field.column

        with schema_editor.connection.cursor() as cursor:
            columns = [
                col.name
                for col in schema_editor.connection.introspection.get_table_description(
                    cursor, table_name
                )
            ]

        if column_name not in columns:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
            logger.info(f"Column '{field.column}' did not exist. Creating it...")
        else:
            logger.info(f"Column '{field.column}' already exists. Skipping creation.")

    def describe(self):
        return f"Adds the field {self.name} to {self.model_name} if it does not exist."
