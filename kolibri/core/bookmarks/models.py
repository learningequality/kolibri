# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from morango.models import UUIDField

from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn


class Bookmark(AbstractFacilityDataModel):

    content_id = UUIDField(blank=True, null=True)
    channel_id = UUIDField(blank=True, null=True)
    contentnode_id = UUIDField()
    user = models.ForeignKey(FacilityUser, blank=False)

    morango_model_name = "bookmark"

    permissions = IsOwn()

    def infer_dataset(self, *args, **kwargs):
        if self.user_id:
            return self.cached_related_dataset_lookup("user")
        elif self.dataset_id:
            # confirm that there exists a facility with that dataset_id
            try:
                return Facility.objects.get(dataset_id=self.dataset_id).dataset_id
            except Facility.DoesNotExist:
                pass
        # if no user or matching facility, infer dataset from the default facility
        facility = Facility.get_default_facility()
        assert facility, "Before you can save bookmarks, you must have a facility"
        return facility.dataset_id

    def calculate_partition(self):
        return "{dataset_id}:user-rw:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.user.id
        )

    class Meta:
        # Ensures that we do not save duplicates, otherwise raises a
        # django.db.utils.IntegrityError
        unique_together = (
            "user",
            "contentnode_id",
        )
