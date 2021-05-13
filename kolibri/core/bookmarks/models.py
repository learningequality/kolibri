# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from kolibri.core.auth.models import FacilityUser
from morango.models import UUIDField


class Bookmark(models.Model):

    id = UUIDField(primary_key=True)
    content_id = models.CharField(max_length=50, null=False, blank=False)
    contentnode_id = models.CharField(max_length=50, null=False, blank=False)
    channel_id = models.CharField(max_length=50, null=False, blank=False)
    facility_user = models.ForeignKey(FacilityUser, blank=False)

    morango_model_name = "bookmark"

    class Meta:
        # Ensures that we do not save duplicates
        unique_together = ('facility_user', 'content_id', 'contentnode_id', 'channel_id')
