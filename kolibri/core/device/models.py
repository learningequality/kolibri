import platform
import time
from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import F
from django.db.models import QuerySet
from morango.models import UUIDField
from morango.models.core import InstanceIDModel
from morango.models.core import SyncSession

from .utils import LANDING_PAGE_LEARN
from .utils import LANDING_PAGE_SIGN_IN
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.auth.permissions.general import IsOwn
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import get_device_setting
from kolibri.core.fields import JSONField
from kolibri.core.utils.cache import process_cache as cache
from kolibri.core.utils.validators import JSON_Schema_Validator
from kolibri.deployment.default.sqlite_db_names import SYNC_QUEUE
from kolibri.plugins.app.utils import interface
from kolibri.utils.conf import OPTIONS
from kolibri.utils.data import ChoicesEnum
from kolibri.utils.options import update_options_file

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


# '"optional":True' is obsolete but needed while we keep using an
# old json_schema_validator version compatible with python 2.7
extra_settings_schema = {
    "type": "object",
    "properties": {
        "allow_download_on_metered_connection": {"type": "boolean"},
        "enable_automatic_download": {"type": "boolean"},
        "allow_learner_download_resources": {"type": "boolean", "optional": True},
        "set_limit_for_autodownload": {"type": "boolean", "optional": True},
        "limit_for_autodownload": {"type": "integer", "optional": True},
    },
    "required": [
        "allow_download_on_metered_connection",
        "enable_automatic_download",
    ],
}

extra_settings_default_values = {
    "allow_download_on_metered_connection": False,
    "enable_automatic_download": True,
    "allow_learner_download_resources": False,
    "set_limit_for_autodownload": False,
    "limit_for_autodownload": 0,
}


class DeviceSettings(models.Model):
    """
    This class stores data about settings particular to this device
    """

    LANDING_PAGE_CHOICES = [
        (LANDING_PAGE_SIGN_IN, "Sign-in page"),
        (LANDING_PAGE_LEARN, "Learn page"),
    ]

    objects = DeviceSettingsManager()

    # Has this device gone through initial setup yet?
    is_provisioned = models.BooleanField(default=False)
    # What is the default language that Kolibri is displayed in for this device?
    language_id = models.CharField(
        max_length=15, default=settings.LANGUAGE_CODE, blank=True, null=True
    )
    # What is the default facility for this device?
    default_facility = models.ForeignKey(
        Facility, on_delete=models.SET_NULL, blank=True, null=True
    )
    # Where should we redirect to on first page load?
    landing_page = models.CharField(
        max_length=7, choices=LANDING_PAGE_CHOICES, default=LANDING_PAGE_SIGN_IN
    )
    # Should users be able to browse content on this device without logging in?
    allow_guest_access = models.BooleanField(default=True)
    # Should peer devices be able to import non-public channels from this device?
    allow_peer_unlisted_channel_import = models.BooleanField(default=False)
    # Should learners be able to access resources that are not assigned to them on this device?
    allow_learner_unassigned_resource_access = models.BooleanField(default=True)
    # What's the name of this device?
    name = models.CharField(max_length=50, default=get_device_hostname)
    # Should this device allow browser sessions from non-localhost devices?
    allow_other_browsers_to_connect = models.BooleanField(default=app_is_enabled)
    # Is this a device that only synchronizes data about a subset of users?
    subset_of_users_device = models.BooleanField(default=False)

    extra_settings = JSONField(
        null=False,
        validators=[JSON_Schema_Validator(extra_settings_schema)],
        default=extra_settings_default_values,
    )

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

    @property
    def primary_storage_location(self):
        return OPTIONS["Paths"]["CONTENT_DIR"]

    @primary_storage_location.setter
    def primary_storage_location(self, value):
        update_options_file("Paths", "CONTENT_DIR", value)

    @property
    def secondary_storage_locations(self):
        return OPTIONS["Paths"]["CONTENT_FALLBACK_DIRS"]

    @secondary_storage_locations.setter
    def secondary_storage_locations(self, value):
        update_options_file("Paths", "CONTENT_FALLBACK_DIRS", value)

    def _get_extra(self, name):
        """
        Allows use with `get_device_setting` utility
        :param name: A str name of the `extra_settings` field
        :return: mixed
        """
        return self.extra_settings.get(name, extra_settings_default_values[name])

    @property
    def allow_download_on_metered_connection(self):
        return self._get_extra("allow_download_on_metered_connection")

    @property
    def enable_automatic_download(self):
        return self._get_extra("enable_automatic_download")

    @property
    def allow_learner_download_resources(self):
        return self._get_extra("allow_learner_download_resources")

    @property
    def set_limit_for_autodownload(self):
        return self._get_extra("set_limit_for_autodownload")

    @property
    def limit_for_autodownload(self):
        return self._get_extra("limit_for_autodownload")


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


class SyncQueue(models.Model):
    """
    This class maintains the queue of the devices that try to sync
    with this server
    """

    id = UUIDField(primary_key=True, default=uuid4)
    user_id = UUIDField(blank=False, null=False)
    instance_id = UUIDField(blank=False, null=False)
    datetime = models.DateTimeField(auto_now_add=True)
    updated = models.FloatField(default=time.time)
    # polling interval is 5 seconds by default
    keep_alive = models.FloatField(default=5.0)

    @classmethod
    def clean_stale(cls):
        """
        This method will delete all the devices from the queue
        with the expire time (in seconds) exhausted
        """
        cls.objects.filter(updated__lte=time.time() - F("keep_alive") * 2).delete()


class SyncQueueRouter(object):
    """
    Determine how to route database calls for the SyncQueue model.
    All other models will be routed to the default database.
    """

    def db_for_read(self, model, **hints):
        """Send all read operations on the SyncQueue model to SYNC_QUEUE."""
        if model is SyncQueue:
            return SYNC_QUEUE
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on the SyncQueue model to SYNC_QUEUE."""
        if model is SyncQueue:
            return SYNC_QUEUE
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""

        # Allow any relation between SyncQueue and SyncQueue.
        if obj1._meta.model is SyncQueue and obj2._meta.model is SyncQueue:
            return True
        # No opinion if neither object is a SyncQueue.
        elif SyncQueue not in [obj1._meta.model, obj2._meta.model]:
            return None

        # Block relationship if one object is a SyncQueue model and the other isn't.
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the SyncQueue models get created on the right database."""
        if (
            app_label == SyncQueue._meta.app_label
            and model_name == SyncQueue._meta.model_name
        ):
            # The SyncQueue model should be migrated only on the SYNC_QUEUE database.
            return db == SYNC_QUEUE
        elif db == SYNC_QUEUE:
            # Ensure that all other apps don't get migrated on the SYNC_QUEUE database.
            return False

        # No opinion for all other scenarios
        return None


class UserSyncStatus(models.Model):
    user = models.ForeignKey(FacilityUser, on_delete=models.CASCADE, null=False)
    sync_session = models.ForeignKey(
        SyncSession, on_delete=models.SET_NULL, null=True, blank=True
    )
    queued = models.BooleanField(default=False)

    # users can read their own SyncStatus
    own = IsOwn(read_only=True)
    # SyncStatus can be read by admins, and coaches, for the member user
    role = RoleBasedPermissions(
        target_field="user",
        can_be_created_by=(),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(),
        can_be_deleted_by=(),
        collection_field="user__memberships__collection",
        is_syncable=False,
    )
    permissions = own | role


class OSUser(models.Model):
    """
    This class stores a lookup from os username to user id
    """

    user = models.OneToOneField(
        FacilityUser,
        on_delete=models.CASCADE,
        related_name="os_user",
        blank=False,
        null=False,
        primary_key=True,
    )
    # Apparently the max length on linux is 8, on Windows it's 30, and not sure on Mac,
    # but hopefully 64 should be long enough for anybody!
    os_username = models.CharField(
        db_index=True, null=False, blank=False, max_length=64
    )


class StatusSentiment(ChoicesEnum):
    Negative = -1
    Neutral = 0
    Positive = 1


class DeviceStatus(ChoicesEnum):
    InsufficientStorage = ("InsufficientStorage", StatusSentiment.Negative)


class LearnerDeviceStatus(AbstractFacilityDataModel):
    """
    Stores information regarding the device's status, scoped to user+instance pair to allow
    syncing under a learner-only device filter
    """

    morango_model_name = "learnerdevicestatus"

    instance_id = UUIDField(max_length=32, editable=False, null=False)
    user = models.OneToOneField(
        FacilityUser,
        on_delete=models.CASCADE,
        related_name="learner_device_status",
        blank=False,
        null=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Since `LearnerDeviceStatus` is a syncable model, we don't pass any `choices` because we want
    # to avoid validating choices for the status in the event more statuses are added in future
    # releases. The sentiment field can be used to if the specific status is unknown
    status = models.CharField(max_length=32, null=False)
    status_sentiment = models.IntegerField(
        null=False, choices=StatusSentiment.choices()
    )

    # users can read their own status
    own = IsOwn(read_only=True)
    # SyncStatus can be read by admins, and coaches, for the member user
    role = RoleBasedPermissions(
        target_field="user",
        can_be_created_by=(),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(),
        can_be_deleted_by=(),
        collection_field="user__memberships__collection",
        is_syncable=True,
    )
    permissions = own | role

    class Meta:
        unique_together = ("instance_id", "user")

    @classmethod
    def save_statuses(cls, status):
        """
        Saves the specified status for all learners on the device, only supported for devices
        provisioned as a `subset_of_users_device`
        :param status: A status tuple of which to save, see `DeviceStatus`
        :type status: tuple(string, int)
        """
        if not get_device_setting(
            "subset_of_users_device", default=not device_provisioned()
        ):
            raise NotImplementedError(
                "Saving all learner statuses is not supported on full-facility devices"
            )

        for user_id in FacilityUser.objects.all().values_list("id", flat=True):
            cls.save_learner_status(user_id, status)

    @classmethod
    def save_learner_status(cls, learner_user_id, status):
        """
        Saves the status for the specified learner

        Example:
            LearnerDeviceStatus.save_learner_status(
                facility_user.id, DeviceStatus.InsufficientStorage
            )

        :param learner_user_id: The ID of the learner (`FacilityUser`) affected by the status
        :param status: A status tuple of which to save, see `DeviceStatus`
        :type status: tuple(string, int)
        """
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]

        # in order to save a status, it must be defined
        if not any(status == choice for _, choice in DeviceStatus.choices()):
            raise ValueError("Value '{}' is not a valid status".format(status[0]))

        cls.objects.update_or_create(
            instance_id=instance_model.id,
            user_id=learner_user_id,
            defaults=dict(zip(("status", "status_sentiment"), status)),
        )

    @classmethod
    def clear_statuses(cls):
        """
        Clears any statuses for all learners on the device, only supported for devices
        provisioned as a `subset_of_users_device`
        :return:
        """
        if not get_device_setting(
            "subset_of_users_device", default=not device_provisioned()
        ):
            raise NotImplementedError(
                "Saving all learner statuses is not supported on full-facility devices"
            )

        for user_id in FacilityUser.objects.all().values_list("id", flat=True):
            cls.clear_learner_status(user_id)

    @classmethod
    def clear_learner_status(cls, learner_user_id):
        """
        :param learner_user_id: The ID of the learner (`FacilityUser`) of which to clear status
        """
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        cls.objects.filter(
            instance_id=instance_model.id, user_id=learner_user_id
        ).delete()

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("user")

    def calculate_source_id(self):
        return "{instance_id}:{user_id}".format(
            instance_id=self.instance_id, user_id=self.user_id
        )

    def calculate_partition(self):
        return "{dataset_id}:user-rw:{user_id}".format(
            dataset_id=self.dataset_id, user_id=self.user_id
        )
