import uuid
from datetime import datetime
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .utils.network.client import ping


class NetworkLocation(models.Model):
    """
    ``NetworkLocation`` stores information about a network address through which an instance of Kolibri can be accessed,
    which can be used to sync content or data.
    """

    EXPIRATION_WINDOW = timedelta(seconds=10)
    DEFAULT_PING_TIMEOUT_SECONDS = 5
    NEVER = datetime(1000, 4, 1, 0, 0, 0, 0, tzinfo=timezone.utc)

    class Meta:
        ordering = ["added"]

    # for statically added network locations: `id` will be a random UUID
    # for dynamically discovered devices: `id` will be the device's `instance_id`
    id = models.CharField(
        primary_key=True, max_length=36, default=uuid.uuid4, editable=False
    )
    dynamic = models.BooleanField(default=False)

    base_url = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100, blank=True)

    # these properties strictly mirror the info given by the device
    application = models.CharField(max_length=32, blank=True)
    kolibri_version = models.CharField(max_length=100, blank=True)
    instance_id = models.CharField(max_length=32, blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    operating_system = models.CharField(max_length=32, blank=True)

    # dates and times
    added = models.DateTimeField(auto_now_add=True, db_index=True)
    last_accessed = models.DateTimeField(auto_now=True)
    last_available = models.DateTimeField(default=NEVER)
    last_unavailable = models.DateTimeField(default=NEVER)

    def ping(self):
        info = ping(self.base_url, timeout=self.DEFAULT_PING_TIMEOUT_SECONDS)
        now = timezone.now()
        if info:
            NetworkLocation.objects.filter(id=self.id).update(
                last_available=now, **info
            )
            return info
        else:
            NetworkLocation.objects.filter(id=self.id).update(last_unavailable=now)
            return None

    @property
    def available(self):
        """
        If this connection was checked recently, report that result,
        otherwise do a fresh check.
        """
        expiration_time = timezone.now() - self.EXPIRATION_WINDOW

        available_recently = self.last_available > expiration_time
        unavailable_recently = self.last_unavailable > expiration_time

        is_available = (
            available_recently and self.last_available > self.last_unavailable
        )

        if is_available:
            return True
        elif unavailable_recently:
            return False
        else:
            return True if self.ping() else False


class StaticNetworkLocationManager(models.Manager):
    def get_queryset(self):
        queryset = super(StaticNetworkLocationManager, self).get_queryset()
        return queryset.filter(dynamic=False).all()


class StaticNetworkLocation(NetworkLocation):
    objects = StaticNetworkLocationManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.dynamic = False
        return super(StaticNetworkLocation, self).save(*args, **kwargs)


class DynamicNetworkLocationManager(models.Manager):
    def get_queryset(self):
        queryset = super(DynamicNetworkLocationManager, self).get_queryset()
        return queryset.filter(dynamic=True).all()

    def purge(self):
        self.get_queryset().delete()


class DynamicNetworkLocation(NetworkLocation):
    objects = DynamicNetworkLocationManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.dynamic = True

        if self.id and self.instance_id and self.id != self.instance_id:
            raise ValidationError(
                {"instance_id": "`instance_id` and `id` must be the same"}
            )

        if self.instance_id:
            return super(DynamicNetworkLocation, self).save(*args, **kwargs)
        else:
            raise ValidationError(
                {
                    "instance_id": "DynamicNetworkLocations must be be created with an instance ID!"
                }
            )
