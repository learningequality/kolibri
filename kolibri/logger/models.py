from __future__ import unicode_literals

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from kolibri.auth.models import FacilityUser
from kolibri.auth.permissions.general import IsOwn
from kolibri.content.models import UUIDField

from .permissions import UserLogPermissions


class ContentInteractionLog(models.Model):
    """
    This Model provides a record of an interaction with a content item.
    """
    permissions = IsOwn(read_only=True) | UserLogPermissions()

    user = models.ForeignKey(FacilityUser, blank=True, null=True, db_index=True)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    start_timestamp = models.DateTimeField(auto_now_add=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    item_session = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=200, blank=True)  # indicates how extra_fields should be interpreted
    extra_fields = models.TextField(blank=True)


class ContentSummaryLog(models.Model):
    """
    This Model provides a summary of all interactions of a user with a content item.
    """
    permissions = IsOwn(read_only=True) | UserLogPermissions()

    user = models.ForeignKey(FacilityUser, blank=True, null=True, db_index=True)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    last_channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    start_timestamp = models.DateTimeField(auto_now_add=True)
    last_activity_timestamp = models.DateTimeField(blank=True, null=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    progress = models.DecimalField(default=0.0, max_digits=2, decimal_places=1)
    kind = models.CharField(max_length=200, blank=True)  # indicates how extra_fields should be interpreted
    extra_fields = models.TextField(blank=True)


class ContentRatingLog(models.Model):
    """
    This Model provides a record of user feedback on content.
    """
    permissions = IsOwn() | UserLogPermissions()

    user = models.ForeignKey(FacilityUser, blank=True, null=True, db_index=True)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False, db_index=True)
    quality = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    ease = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    learning = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)


class UserSessionLog(models.Model):
    """
    This Model provides a record of a user session in Kolibri.
    """
    permissions = IsOwn(read_only=True) | UserLogPermissions()

    user = models.ForeignKey(FacilityUser, blank=True, null=True, db_index=True)
    channels = models.TextField(blank=True)
    start_timestamp = models.DateTimeField(auto_now_add=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    pages = models.TextField(blank=True)
