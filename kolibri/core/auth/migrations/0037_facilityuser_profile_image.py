from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("kolibriauth", "0036_facilityuser_qr_login_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="facilityuser",
            name="profile_image",
            field=models.TextField(blank=True, default=None, null=True),
        ),
    ]
