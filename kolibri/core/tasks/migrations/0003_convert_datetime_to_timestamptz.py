from django.db import migrations


def convert_datetime_columns_to_timestamptz(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    columns = ("scheduled_time", "time_created", "time_updated")
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'jobs'
              AND table_schema = current_schema()
              AND column_name = ANY(%s)
              AND data_type = 'timestamp without time zone'
            """,
            [list(columns)],
        )
        cols_to_convert = [row[0] for row in cursor.fetchall()]
    if cols_to_convert:
        alter_clauses = ", ".join(
            "ALTER COLUMN {col} TYPE TIMESTAMP WITH TIME ZONE"
            " USING {col} AT TIME ZONE 'UTC'".format(col=schema_editor.quote_name(col))
            for col in cols_to_convert
        )
        schema_editor.execute("ALTER TABLE jobs " + alter_clauses)


class Migration(migrations.Migration):
    dependencies = [
        ("kolibritasks", "0002_add_retries_fields"),
    ]

    operations = [
        migrations.RunPython(
            convert_datetime_columns_to_timestamptz,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
