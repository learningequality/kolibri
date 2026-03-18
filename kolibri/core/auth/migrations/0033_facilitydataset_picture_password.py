from django.db import migrations
from django.db import models

import kolibri.core.fields
import kolibri.core.utils.validators


class Migration(migrations.Migration):

    dependencies = [
        ("kolibriauth", "0032_alter_facilityuser_managers"),
    ]

    operations = [
        migrations.AddField(
            model_name="facilitydataset",
            name="learner_can_login_with_picture_password",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="facilitydataset",
            name="picture_password_settings",
            field=kolibri.core.fields.JSONField(
                blank=True,
                default=None,
                null=True,
                validators=[
                    kolibri.core.utils.validators.JSON_Schema_Validator(
                        {
                            "type": "object",
                            "properties": {
                                "icon_style": {
                                    "type": "string",
                                    "enum": ["standard", "colorful"],
                                },
                                "show_icon_text": {"type": "boolean"},
                            },
                            "required": ["icon_style", "show_icon_text"],
                        }
                    )
                ],
            ),
        ),
    ]
