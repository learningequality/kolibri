from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0044_contentrequest_priority_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelmetadata",
            name="library",
            field=models.CharField(
                blank=True,
                choices=[("COMMUNITY", "Community"), ("KOLIBRI", "Kolibri")],
                max_length=50,
                null=True,
            ),
        ),
    ]
