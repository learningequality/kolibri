import uuid

from django.db import models

from .utils.network.client import NetworkClient
from .utils.network.errors import NetworkClientError


class NetworkLocation(models.Model):
    """
    ``NetworkLocation`` stores information about a network address through which an instance of Kolibri can be accessed,
    which can be used to sync content or data.
    """

    class Meta:
        ordering = ["added"]

    # for statically added network locations: `id` will be a random UUID
    # for dynamically discovered devices: `id` will be the device's `instance_id`
    id = models.CharField(
        primary_key=True, max_length=36, default=uuid.uuid4, editable=False
    )
    base_url = models.CharField(max_length=100)

    application = models.CharField(max_length=32, blank=True)
    kolibri_version = models.CharField(max_length=100, blank=True)
    instance_id = models.CharField(max_length=32, blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    operating_system = models.CharField(max_length=32, blank=True)

    added = models.DateTimeField(auto_now_add=True, db_index=True)
    last_accessed = models.DateTimeField(auto_now=True)

    dynamic = models.BooleanField(default=False)

    @property
    def available(self):
        try:
            info = NetworkClient(base_url=self.base_url).info
            self.application = info.get("application", self.application) or ""
            self.kolibri_version = (
                info.get("kolibri_version", self.kolibri_version) or ""
            )
            self.device_name = self.device_name or info.get("device_name") or ""
            self.instance_id = info.get("instance_id", self.instance_id) or ""
            self.operating_system = (
                info.get("operating_system", self.operating_system) or ""
            )
            self.save()
            return True
        except NetworkClientError:
            if self.dynamic:
                self.delete()
            return False


class StaticNetworkLocationManager(models.Manager):
    def get_queryset(self):
        queryset = super(StaticNetworkLocationManager, self).get_queryset()
        return queryset.filter(dynamic=False)


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
        return queryset.filter(dynamic=True)

    def purge(self):
        self.get_queryset().delete()


class DynamicNetworkLocation(NetworkLocation):
    objects = DynamicNetworkLocationManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.dynamic = True
        return super(DynamicNetworkLocation, self).save(*args, **kwargs)
