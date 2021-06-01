# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import ObjectDoesNotExist
from django.db import migrations
from django.db import models
from django.db.migrations.recorder import MigrationRecorder


def migrate_allow_guest_access(apps, schema_editor):
    # if this migration has been run, drop out because logic depends on a field that no longer exists
    if MigrationRecorder.Migration.objects.filter(
        app="kolibriauth",
        name="0017_remove_facilitydataset_allow_guest_access",
        applied__isnull=False,
    ).exists():
        return
    FacilityDataset = apps.get_model("kolibriauth", "FacilityDataset")
    DeviceSettings = apps.get_model("device", "DeviceSettings")

    try:
        default_facility = DeviceSettings.objects.get().default_facility
        allow_guest_access = default_facility.dataset.allow_guest_access
    except ObjectDoesNotExist:
        allow_guest_access = (
            FacilityDataset.objects.filter(allow_guest_access=False).count() <= 0
        )

    DeviceSettings.objects.update(allow_guest_access=allow_guest_access)


def revert_allow_guest_access(apps, schema_editor):
    FacilityDataset = apps.get_model("kolibriauth", "FacilityDataset")
    DeviceSettings = apps.get_model("device", "DeviceSettings")

    allow_guest_access = (
        DeviceSettings.objects.filter(allow_guest_access=False).count() <= 0
    )

    try:
        default_facility = DeviceSettings.objects.get().default_facility
        default_facility.dataset.allow_guest_access = allow_guest_access
        default_facility.dataset.save()
    except ObjectDoesNotExist:
        # if this migration has been run, this will error because logic depends on a field that no longer exists
        try:
            FacilityDataset.objects.update(allow_guest_access=allow_guest_access)
        except FieldDoesNotExist:
            pass


class Migration(migrations.Migration):

    dependencies = [("device", "0005_auto_20191203_0951")]

    operations = [
        migrations.RunPython(migrate_allow_guest_access, revert_allow_guest_access)
    ]
