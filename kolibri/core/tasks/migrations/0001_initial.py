from django.db import migrations
from django.db import models

from kolibri.core.tasks.operations import AddIndexIfNotExists
from kolibri.core.tasks.operations import CreateModelIfNotExists


def drop_015_job_tables(apps, schema_editor):
    connection = schema_editor.connection
    introspection = connection.introspection
    tables_to_drop = []
    with connection.cursor() as cursor:
        tables = introspection.table_names(cursor)
        if "jobs" in tables and "func" not in {
            column.name
            for column in introspection.get_table_description(cursor, "jobs")
        }:
            tables_to_drop.append("jobs")
        if "scheduledjobs" in tables and (
            tables_to_drop
            or introspection.get_constraints(cursor, "scheduledjobs")
            .get("queue__scheduled_time", {})
            .get("index")
        ):
            tables_to_drop.append("scheduledjobs")
    for table in tables_to_drop:
        schema_editor.execute(
            schema_editor.sql_delete_table % {"table": schema_editor.quote_name(table)}
        )


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.RunPython(
            drop_015_job_tables,
            reverse_code=migrations.RunPython.noop,
            hints={"model_name": "job"},
        ),
        CreateModelIfNotExists(
            name="Job",
            fields=[
                ("id", models.CharField(max_length=36, primary_key=True)),
                ("state", models.CharField(max_length=20, db_index=True)),
                ("func", models.CharField(max_length=200, db_index=True)),
                ("priority", models.IntegerField(db_index=True)),
                ("queue", models.CharField(max_length=50, db_index=True)),
                ("saved_job", models.TextField()),
                ("time_created", models.DateTimeField(null=True, blank=True)),
                ("time_updated", models.DateTimeField(null=True, blank=True)),
                ("interval", models.IntegerField(default=0)),
                ("retry_interval", models.IntegerField(null=True, blank=True)),
                ("repeat", models.IntegerField(null=True, blank=True)),
                ("scheduled_time", models.DateTimeField(null=True, blank=True)),
                (
                    "worker_host",
                    models.CharField(max_length=100, null=True, blank=True),
                ),
                (
                    "worker_process",
                    models.CharField(max_length=50, null=True, blank=True),
                ),
                (
                    "worker_thread",
                    models.CharField(max_length=50, null=True, blank=True),
                ),
                ("worker_extra", models.TextField(null=True, blank=True)),
            ],
            options={
                "db_table": "jobs",
            },
        ),
        AddIndexIfNotExists(
            model_name="job",
            index=models.Index(
                fields=["queue", "scheduled_time"], name="queue__scheduled_time"
            ),
        ),
    ]
