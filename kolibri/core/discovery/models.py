import uuid
from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .utils.network.connections import check_connection_info
from kolibri.deployment.default.sqlite_db_names import NETWORK_LOCATION


def _filter_out_unsupported_fields(fields):
    return {k: v for (k, v) in fields.items() if NetworkLocation.has_field(k)}


class NetworkLocation(models.Model):
    """
    ``NetworkLocation`` stores information about a network address through which an instance of Kolibri can be accessed,
    which can be used to sync content or data.
    """

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
    subset_of_users_device = models.BooleanField(default=False)

    # dates and times
    added = models.DateTimeField(auto_now_add=True, db_index=True)
    last_accessed = models.DateTimeField(auto_now=True)

    @property
    def available(self):
        """
        If this connection was checked recently, report that result,
        otherwise do a fresh check.
        """
        connection_info = check_connection_info(self.base_url)
        return bool(connection_info)

    @classmethod
    def has_field(cls, field):
        try:
            cls._meta.get_field(field)
            return True
        except models.FieldDoesNotExist:
            return False


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

    def create(self, *args, **kwargs):
        kwargs = _filter_out_unsupported_fields(kwargs)
        return super(DynamicNetworkLocationManager, self).create(*args, **kwargs)

    def update_or_create(self, defaults, **kwargs):
        defaults = _filter_out_unsupported_fields(defaults)

        return super(DynamicNetworkLocationManager, self).update_or_create(
            defaults, **kwargs
        )


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


class NetworkLocationRouter(object):
    """
    Determine how to route database calls for the Network Location models.
    All other models will be routed to the default database.
    """

    def db_for_read(self, model, **hints):
        """Send all read operations on Notifications app models to NETWORK_LOCATION."""
        if issubclass(model, NetworkLocation):
            return NETWORK_LOCATION
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on Notifications app models to NETWORK_LOCATION."""
        if issubclass(model, NetworkLocation):
            return NETWORK_LOCATION
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""
        obj1_instance = isinstance(obj1, NetworkLocation)
        obj2_instance = isinstance(obj2, NetworkLocation)
        # Allow any relation between two models that are both in the Network Location models.
        if obj1_instance and obj2_instance:
            return True
        # No opinion if neither object is in the Network Location models (defer to default or other routers).
        elif not obj1_instance and not obj2_instance:
            return None

        # Block relationship if one object is in the Network Location models and the other isn't.
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the Network Location models's models get created on the right database."""
        if app_label == NetworkLocation._meta.app_label and any(
            model_name == m._meta.model_name
            for m in (NetworkLocation, StaticNetworkLocation, DynamicNetworkLocation)
        ):
            # The Network Location models should be migrated only on the NETWORK_LOCATION database.
            return db == NETWORK_LOCATION
        elif db == NETWORK_LOCATION:
            # Ensure that all other apps don't get migrated on the NETWORK_LOCATION database.
            return False
        # No opinion for all other scenarios
        return None
