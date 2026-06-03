from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0045_channelmetadata_library"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentrequest",
            name="channel_version",
            field=models.IntegerField(blank=True, default=None, null=True),
        ),
        migrations.AlterUniqueTogether(
            name="contentrequest",
            unique_together={
                (
                    "type",
                    "source_model",
                    "source_id",
                    "contentnode_id",
                    "channel_version",
                )
            },
        ),
    ]
