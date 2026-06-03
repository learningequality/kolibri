from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0042_remove_modality"),
    ]

    operations = [
        # Add the column as nullable with no default so the DB ALTER is lock-free
        # on large tables (no backfill happens at migration time).  Existing rows
        # will have NULL until the backfill_content_request_priority task runs.
        migrations.AddField(
            model_name="contentrequest",
            name="priority",
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
