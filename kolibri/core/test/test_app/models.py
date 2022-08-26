import datetime

from django.db import models
from django.utils import timezone

from kolibri.core.fields import DateTimeTzField


def aware_datetime():
    return timezone.get_current_timezone().localize(
        datetime.datetime(2000, 12, 11, 10, 9, 8)
    )


class User(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Classroom(models.Model):
    name = models.CharField(max_length=128, default="", blank=True)


class Membership(models.Model):
    user = models.ForeignKey(
        "User",
        related_name="memberships",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )
    classroom = models.ForeignKey(
        "Classroom",
        related_name="memberships",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )


class DateTimeTzModel(models.Model):
    timestamp = DateTimeTzField(null=True)
    default_timestamp = DateTimeTzField(default=aware_datetime)
