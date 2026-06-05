# Initial migration for the jobs table. This model/index creation should be
# skipped if the table was previously created by SQLAlchemy.
from django.db import migrations
from django.db import models

from kolibri.core.tasks.operations import AddIndexIfNotExists
from kolibri.core.tasks.operations import CreateModelIfNotExists


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
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
