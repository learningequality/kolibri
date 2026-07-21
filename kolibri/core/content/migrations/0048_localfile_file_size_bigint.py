from django.db import migrations
from django.db import models

from kolibri.core.content.utils.file_size_migration import drop_legacy_file_size_column
from kolibri.core.content.utils.file_size_migration import localfile_columns


def add_file_size_bigint_column(apps, schema_editor):
    if "file_size_bigint" not in localfile_columns(schema_editor.connection):
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE content_localfile ADD COLUMN file_size_bigint bigint"
            )


def drop_legacy_file_size_if_empty(apps, schema_editor):
    """Drop legacy file_size on fresh installs; existing installs defer to the upgrade task."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM content_localfile LIMIT 1")
        has_rows = cursor.fetchone() is not None
    if has_rows:
        return
    LocalFile = apps.get_model("content", "LocalFile")
    drop_legacy_file_size_column(schema_editor, LocalFile)


def restore_legacy_file_size(apps, schema_editor):
    """Reverse of drop_legacy_file_size_if_empty."""
    if "file_size" not in localfile_columns(schema_editor.connection):
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("ALTER TABLE content_localfile ADD COLUMN file_size integer")


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0047_file_included_presets"),
    ]

    operations = [
        # Update migration state first so the RunPython functions below see
        # file_size.column == "file_size_bigint" in the historical model.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="localfile",
                    name="file_size",
                    field=models.BigIntegerField(
                        blank=True, null=True, db_column="file_size_bigint"
                    ),
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(
            add_file_size_bigint_column,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            drop_legacy_file_size_if_empty,
            reverse_code=restore_legacy_file_size,
        ),
    ]
