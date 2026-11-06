import random

from django.db import models

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn
from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import JSONField
from kolibri.utils.time_utils import local_now

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
    prompt. Hard-deleted on dismiss.
    """

    key = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PingbackStatus(models.Model):
    last_succeeded = DateTimeTzField()

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def record_success(cls):
        cls(last_succeeded=local_now()).save()


def random_donation_variant():
    return random.choice(DonationNotificationStatus.VARIANTS)


class DonationNotificationStatus(models.Model):
    VARIANTS = ("a", "b")

    variant = models.CharField(
        max_length=1,
        choices=[(v, v) for v in VARIANTS],
        default=random_donation_variant,
    )
    last_dismissed = DateTimeTzField(null=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def _read(cls, field):
        return cls.objects.filter(pk=1).values_list(field, flat=True).first()

    @classmethod
    def assigned_variant(cls):
        return cls._read("variant")

    @classmethod
    def last_dismissed_at(cls):
        return cls._read("last_dismissed")

    @classmethod
    def record_dismissal(cls):
        cls.objects.update_or_create(pk=1, defaults={"last_dismissed": local_now()})
