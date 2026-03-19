from django.db import migrations

import kolibri.core.fields
import kolibri.core.utils.validators


class Migration(migrations.Migration):

    dependencies = [
        ("kolibriauth", "0033_facilityuser_add_picture_password"),
    ]

    operations = [
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
