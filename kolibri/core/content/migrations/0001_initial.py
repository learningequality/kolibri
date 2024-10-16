# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2017-05-16 22:32
import morango.models
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ChannelMetadataCache",
            fields=[
                ("id", morango.models.UUIDField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("description", models.CharField(blank=True, max_length=400)),
                ("author", models.CharField(blank=True, max_length=400)),
                ("version", models.IntegerField(default=0)),
                ("thumbnail", models.TextField(blank=True)),
                ("root_pk", morango.models.UUIDField()),
            ],
            options={"abstract": False},
        )
    ]
