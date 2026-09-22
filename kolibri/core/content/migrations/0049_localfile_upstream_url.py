from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0048_localfile_file_size_bigint"),
    ]

    operations = [
        migrations.AddField(
            model_name="localfile",
            name="upstream_url",
            field=models.TextField(blank=True, null=True),
        ),
    ]
