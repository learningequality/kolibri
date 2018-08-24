from django.db import models

from .utils.network.client import NetworkClient
from .utils.network.errors import NetworkClientError


class NetworkLocation(models.Model):
    """
    ``NetworkLocation`` stores information about a network address through which an instance of Kolibri can be accessed,
    which can be used to sync content or data.
    """

    base_url = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100, blank=True)
    instance_id = models.CharField(max_length=32, blank=True)
    added = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)

    @property
    def available(self):
        try:
            NetworkClient(base_url=self.base_url)
            return True
        except NetworkClientError:
            return False
