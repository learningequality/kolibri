# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from jsonfield import JSONField

from .constants import nutrition_endpoints
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn


class PingbackNotification(models.Model):

    id = models.CharField(max_length=50, primary_key=True)
    version_range = models.CharField(max_length=50)
    timestamp = models.DateField()
    link_url = models.CharField(max_length=150, blank=True)
    i18n = JSONField(default={})
    active = models.BooleanField(default=True)
    source = models.CharField(max_length=20, choices=nutrition_endpoints.choices)


class PingbackNotificationDismissed(models.Model):

    permissions = IsOwn()

    user = models.ForeignKey(FacilityUser)
    notification = models.ForeignKey(PingbackNotification)

    class Meta:
        unique_together = (("user", "notification"),)
