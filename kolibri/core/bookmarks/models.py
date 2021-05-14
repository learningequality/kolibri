# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import uuid

from django.db import models
from morango.models import UUIDField

from kolibri.core.auth.models import FacilityUser


class Bookmark(models.Model):

    id = UUIDField(primary_key=True, default=uuid.uuid4)
    content_id = models.CharField(max_length=50, null=False, blank=False)
    contentnode_id = models.CharField(max_length=50, null=False, blank=False)
    channel_id = models.CharField(max_length=50, null=False, blank=False)
    facility_user = models.ForeignKey(FacilityUser, blank=False)

    morango_model_name = "bookmark"

    class Meta:
        # Ensures that we do not save duplicates, otherwise raises a
        # django.db.utils.IntegrityError
        unique_together = (
            "facility_user",
            "content_id",
            "contentnode_id",
            "channel_id",
        )
