from django.db import migrations
from django.db import models

import kolibri.core.fields


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0049_localfile_upstream_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentrequest",
            name="failure_count",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="contentrequest",
            name="retry_after",
            field=kolibri.core.fields.DateTimeTzField(blank=True, null=True),
        ),
    ]
