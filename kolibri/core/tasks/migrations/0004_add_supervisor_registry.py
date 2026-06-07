# Adds the supervisor registry table and the supervisor_id column on jobs,
# used to detect dead supervisors and requeue their orphaned jobs.
import morango.models.fields.uuids
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("kolibritasks", "0003_convert_datetime_to_timestamptz"),
    ]

    operations = [
        migrations.CreateModel(
            name="Supervisor",
            fields=[
                (
                    "id",
                    morango.models.fields.uuids.UUIDField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("host", models.CharField(max_length=100)),
                ("process", models.CharField(max_length=50)),
                ("thread", models.CharField(max_length=50)),
                ("last_seen", models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.AddField(
            model_name="job",
            name="supervisor_id",
            field=morango.models.fields.uuids.UUIDField(blank=True, null=True),
        ),
    ]
