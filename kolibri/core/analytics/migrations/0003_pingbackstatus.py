from django.db import migrations
from django.db import models

import kolibri.core.fields


class Migration(migrations.Migration):
    dependencies = [
        ("analytics", "0002_localnotification"),
    ]

    operations = [
        migrations.CreateModel(
            name="PingbackStatus",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("last_succeeded", kolibri.core.fields.DateTimeTzField()),
            ],
        ),
    ]
