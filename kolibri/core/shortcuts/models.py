"""
This app provides the core functionality for managing shortcuts to content
with the Kolibri app. It stores shortcuts either per user or facility-wide.
"""
from __future__ import unicode_literals

from django.db import models
from morango.models import SyncableModelQuerySet
from morango.models import UUIDField

from .permissions import AnyoneCanReadOwnerlessShortcuts
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn
from kolibri.core.auth.permissions.general import IsFromSameFacility
from kolibri.core.content.models import ContentNode
from kolibri.core.fields import JSONField


class BaseShortcutQuerySet(SyncableModelQuerySet):
    def filter_by_topic(self, topic, content_id_lookup="content_id"):
        content_ids = topic.get_descendant_content_ids()
        return self.filter_by_content_ids(content_ids)

    def filter_by_content_ids(self, content_ids, content_id_lookup="content_id"):
        return self.filter(**{content_id_lookup + "__in": content_ids})


class BaseShortcutModel(AbstractFacilityDataModel):
    objects = BaseShortcutQuerySet.as_manager()

    class Meta:
        abstract = True


class Shortcut(BaseShortcutModel):
    """
    A shortcut to a content node.

    This indicates that a content node should be listed in the Learn page for a particular user.
    """

    # Morango syncing settings
    morango_model_name = "shortcut"

    permissions = IsOwn(field_name="user_id") | AnyoneCanReadOwnerlessShortcuts()

    user = models.ForeignKey(FacilityUser, blank=True, null=True)
    contentnode = models.ForeignKey(ContentNode, related_name="shortcuts")
    extra_fields = JSONField(default={}, blank=True)

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
        assert facility, "Before you can create shortcuts, you must have a facility"
        return facility.dataset_id

    def calculate_partition(self):
        if self.user_id:
            return "{dataset_id}:user-rw:{user_id}".format(
                dataset_id=self.dataset_id, user_id=self.user_id
            )
        else:
            return "{dataset_id}:anonymous".format(dataset_id=self.dataset_id)
