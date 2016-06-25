from __future__ import unicode_literals

import uuid

from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from kolibri.content.models import UUIDField
from kolibri.auth.models import FacilityUser


class ContentInteractionLog(models.Model):
    """
    This Model provides a record of an interaction with a content item.
    """
    user = models.ForeignKey(FacilityUser)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    start_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    completion_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    item_session = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    kind = ""  # indicates how extra_fields should be interpreted
    extra_fields = models.TextField(blank=True)


class ContentSummaryLog(models.Model):
    """
    This Model provides a summary of all interactions of a user with a content item.
    """
    user = models.ForeignKey(FacilityUser)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    last_channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    start_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    last_activity_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    completion_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    progress = models.DecimalField(default=0.0, max_digits=2, decimal_places=1)
    extra_fields = models.TextField(blank=True)


class ContentRatingLog(models.Model):
    """
    This Model provides a record of user feedback on content.
    """
    user = models.ForeignKey(FacilityUser)
    content_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    channel_id = UUIDField(primary_key=False, default=uuid.uuid4, editable=False)
    quality = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    ease = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    learning = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)


class UserSessionLog(models.Model):
    """
    This Model provides a record of a user session in Kolibri.
    """
    user = models.ForeignKey(FacilityUser)
    channels = models.TextField(blank=True)
    start_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    completion_timestamp = models.DateTimeField(auto_now=False, auto_now_add=False)
    pages = models.TextField(blank=True)
