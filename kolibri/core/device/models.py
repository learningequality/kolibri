import platform
import time
from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import QuerySet
from morango.models import UUIDField

from .utils import LANDING_PAGE_LEARN
from .utils import LANDING_PAGE_SIGN_IN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.utils.cache import process_cache as cache
from kolibri.plugins.app.utils import interface

device_permissions_fields = ["is_superuser", "can_manage_content"]


class DevicePermissions(models.Model):
    """
    This class stores metadata about device permissions for FacilityUsers.
    """

    user = models.OneToOneField(
        FacilityUser,
        on_delete=models.CASCADE,
        related_name="devicepermissions",
        blank=False,
        null=False,
        primary_key=True,
    )
    is_superuser = models.BooleanField(default=False)
    can_manage_content = models.BooleanField(default=False)


DEVICE_SETTINGS_CACHE_KEY = "device_settings_cache_key"


class DeviceSettingsQuerySet(QuerySet):
    def delete(self, **kwargs):
        cache.delete(DEVICE_SETTINGS_CACHE_KEY)
        return super(DeviceSettingsQuerySet, self).delete(**kwargs)


class DeviceSettingsManager(models.Manager.from_queryset(DeviceSettingsQuerySet)):
    def get(self, **kwargs):
        if DEVICE_SETTINGS_CACHE_KEY not in cache:
            model = super(DeviceSettingsManager, self).get(**kwargs)
            cache.set(DEVICE_SETTINGS_CACHE_KEY, model, 600)
        else:
            model = cache.get(DEVICE_SETTINGS_CACHE_KEY)
        return model


def get_device_hostname():
    # Get the device hostname to set it as the default value of name field in
    # DeviceSettings model
    hostname = platform.node()

    # make sure the default name does not exceed max length of the field
    return hostname[:50]


def app_is_enabled():
    return interface.enabled


class DeviceSettings(models.Model):
    """
    This class stores data about settings particular to this device
    """

    LANDING_PAGE_CHOICES = [
        (LANDING_PAGE_SIGN_IN, "Sign-in page"),
        (LANDING_PAGE_LEARN, "Learn page"),
    ]

    objects = DeviceSettingsManager()

    is_provisioned = models.BooleanField(default=False)
    language_id = models.CharField(
        max_length=15, default=settings.LANGUAGE_CODE, blank=True, null=True
    )
    default_facility = models.ForeignKey(
        Facility, on_delete=models.SET_NULL, blank=True, null=True
    )
    landing_page = models.CharField(
        max_length=7, choices=LANDING_PAGE_CHOICES, default=LANDING_PAGE_SIGN_IN
    )
    allow_guest_access = models.BooleanField(default=True)
    allow_peer_unlisted_channel_import = models.BooleanField(default=False)
    allow_learner_unassigned_resource_access = models.BooleanField(default=True)
    name = models.CharField(max_length=50, default=get_device_hostname)
    allow_other_browsers_to_connect = models.BooleanField(default=app_is_enabled)

    def save(self, *args, **kwargs):
        self.pk = 1
        self.full_clean()
        out = super(DeviceSettings, self).save(*args, **kwargs)
        cache.set(DEVICE_SETTINGS_CACHE_KEY, self, 600)
        return out

    def delete(self, *args, **kwargs):
        out = super(DeviceSettings, self).delete(*args, **kwargs)
        cache.delete(DEVICE_SETTINGS_CACHE_KEY)
        return out


CONTENT_CACHE_KEY_CACHE_KEY = "content_cache_key"


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
        cache.set(CONTENT_CACHE_KEY_CACHE_KEY, cache_key.key, 5000)
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


APP_KEY_CACHE_KEY = "app_key"


class DeviceAppKey(models.Model):
    """
    This class stores a key that is checked to make sure that a webview
    is making requests from a privileged device (i.e. from inside an
    app-wrapper webview)
    """

    key = UUIDField(default=uuid4)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(DeviceAppKey, self).save(*args, **kwargs)

    @classmethod
    def update_app_key(cls):
        app_key, created = cls.objects.get_or_create()
        app_key.key = uuid4().hex
        app_key.save()
        cache.set(APP_KEY_CACHE_KEY, app_key.key, 5000)
        return app_key

    @classmethod
    def get_app_key(cls):
        key = cache.get(APP_KEY_CACHE_KEY)
        if key is None:
            try:
                app_key = cls.objects.get()
            except cls.DoesNotExist:
                app_key = cls.update_app_key()
            key = app_key.key
            cache.set(APP_KEY_CACHE_KEY, key, 5000)
        return key


class SQLiteLock(models.Model):
    id = models.AutoField(primary_key=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(SQLiteLock, self).save(*args, **kwargs)
