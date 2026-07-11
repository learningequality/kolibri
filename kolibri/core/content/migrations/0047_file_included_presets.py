from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0046_contentrequest_channel_version"),
    ]

    operations = [
        migrations.AddField(
            model_name="file",
            name="included_presets",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
