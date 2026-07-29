from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("kolibritasks", "0004_add_supervisor_registry"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="last_finished_state",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="job",
            name="last_finished_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
