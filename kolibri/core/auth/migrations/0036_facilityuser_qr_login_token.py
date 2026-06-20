# Generated for QR code login feature
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("kolibriauth", "0035_facilitydataset_picture_password_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="facilityuser",
            name="qr_login_token",
            field=models.CharField(
                blank=True,
                default=None,
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="facilitydataset",
            name="enable_qr_login",
            field=models.BooleanField(default=False),
        ),
    ]
