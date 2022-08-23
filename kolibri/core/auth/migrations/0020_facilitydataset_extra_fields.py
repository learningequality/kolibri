# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2022-07-25 09:14
from __future__ import unicode_literals

from django.db import migrations

import kolibri.core.fields


class Migration(migrations.Migration):

    dependencies = [
        ("kolibriauth", "0019_collection_no_mptt"),
    ]

    operations = [
        migrations.AddField(
            model_name="facilitydataset",
            name="extra_fields",
            field=kolibri.core.fields.JSONField(blank=True, null=True),
        ),
    ]
