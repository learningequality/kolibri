from django.db import models

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn
from kolibri.core.fields import JSONField

from .constants import nutrition_endpoints


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

    user = models.ForeignKey(FacilityUser, on_delete=models.CASCADE)
    notification = models.ForeignKey(PingbackNotification, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("user", "notification"),)


class LocalNotification(models.Model):
    """
    A notification generated locally by a trigger evaluator, e.g. the impact-stories
    prompt. Hard-deleted on dismiss; cooldown is enforced by the generator task
    rescheduling itself, not by retaining dismissed rows.
    """

    key = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
