import time

from django.conf import settings
from django.core.cache import cache
from django.db import models

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

device_permissions_fields = [
    'is_superuser',
    'can_manage_content',
]


class DevicePermissions(models.Model):
    """
    This class stores metadata about device permissions for FacilityUsers.
    """
    user = models.OneToOneField(
        FacilityUser,
        on_delete=models.CASCADE,
        related_name='devicepermissions',
        blank=False,
        null=False,
        primary_key=True,
    )
    is_superuser = models.BooleanField(default=False)
    can_manage_content = models.BooleanField(default=False)


class DeviceSettings(models.Model):
    """
    This class stores data about settings particular to this device
    """
    is_provisioned = models.BooleanField(default=False)
    language_id = models.CharField(max_length=15, default=settings.LANGUAGE_CODE)
    default_facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, blank=True, null=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(DeviceSettings, self).save(*args, **kwargs)


CONTENT_CACHE_KEY_CACHE_KEY = 'content_cache_key'


class ContentCacheKey(models.Model):
    """
    This class stores a cache key for content models that should be updated
    whenever the content metadata stored on the device changes.
    """

    key = models.IntegerField(default=time.time)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(ContentCacheKey, self).save(*args, **kwargs)

    @classmethod
    def update_cache_key(cls):
        cache_key, created = cls.objects.get_or_create()
        cache_key.key = time.time()
        cache_key.save()
        cache.delete(CONTENT_CACHE_KEY_CACHE_KEY)
        return cache_key

    @classmethod
    def get_cache_key(cls):
        key = cache.get(CONTENT_CACHE_KEY_CACHE_KEY)
        if key is None:
            try:
                cache_key = cls.objects.get()
            except cls.DoesNotExist:
                cache_key = cls.update_cache_key()
            key = cache_key.key
            cache.set(CONTENT_CACHE_KEY_CACHE_KEY, key, 5000)
        return key
