from django.db import models

from .utils.network.client import NetworkClient
from .utils.network.errors import NetworkClientError


class NetworkLocation(models.Model):
    """
    ``NetworkLocation`` stores information about a network address through which an instance of Kolibri can be accessed,
    which can be used to sync content or data.
    """

    base_url = models.CharField(max_length=100)

    application = models.CharField(max_length=32, blank=True)
    kolibri_version = models.CharField(max_length=100, blank=True)
    instance_id = models.CharField(max_length=32, blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    operating_system = models.CharField(max_length=32, blank=True)

    added = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)

    @property
    def available(self):
        try:
            info = NetworkClient(base_url=self.base_url).info
            self.application = info.get("application", self.application) or ""
            self.kolibri_version = info.get("kolibri_version", self.kolibri_version) or ""
            self.device_name = self.device_name or info.get("device_name") or ""
            self.instance_id = info.get("instance_id", self.instance_id) or ""
            self.operating_system = info.get("operating_system", self.operating_system) or ""
            self.save()
            return True
        except NetworkClientError:
            return False
