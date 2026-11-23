from django.db import migrations
from django.db import models

import kolibri.core.fields
import morango.models.fields.uuids


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0049_localfile_upstream_url"),
    ]

    operations = [
        migrations.CreateModel(
            name="VirtualContentNode",
            fields=[
                (
                    "id",
                    morango.models.fields.uuids.UUIDField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("root_id", morango.models.fields.uuids.UUIDField()),
                ("channel_id", morango.models.fields.uuids.UUIDField()),
                ("title", models.CharField(blank=True, max_length=200)),
                (
                    "kind",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("topic", "Topic"),
                            ("video", "Video"),
                            ("audio", "Audio"),
                            ("exercise", "Exercise"),
                            ("document", "Document"),
                            ("html5", "HTML5 App"),
                            ("slideshow", "Slideshow"),
                            ("h5p", "H5P"),
                            ("zim", "Zim"),
                            ("quiz", "Quiz"),
                        ],
                        max_length=200,
                    ),
                ),
                (
                    "options",
                    kolibri.core.fields.JSONField(blank=True, default={}, null=True),
                ),
            ],
        ),
        migrations.CreateModel(
            name="VirtualContentRoot",
            fields=[
                (
                    "root_id",
                    morango.models.fields.uuids.UUIDField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("channel_id", morango.models.fields.uuids.UUIDField()),
                ("local_file_id", morango.models.fields.uuids.UUIDField()),
            ],
        ),
    ]
