from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0043_contentrequest_priority"),
    ]

    operations = [
        # Step 2: attach the default (ContentRequestPriority.REGULAR = 20) and
        # choices now that the column exists.  This operation only updates
        # Django's in-memory schema; no rows are touched here — existing NULL
        # rows are backfilled asynchronously by backfill_content_request_priority.
        migrations.AlterField(
            model_name="contentrequest",
            name="priority",
            field=models.IntegerField(
                default=20,
                choices=[
                    (5, "CRITICAL"),
                    (10, "URGENT"),
                    (15, "HIGH"),
                    (20, "REGULAR"),
                    (25, "LOW"),
                ],
                null=True,
                blank=True,
            ),
        ),
    ]
