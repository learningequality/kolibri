import uuid

from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from morango.models import UUIDField

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.general import IsOwn
from kolibri.core.upgrade import matches_version
from kolibri.deployment.default.sqlite_db_names import NETWORK_LOCATION
from kolibri.utils.data import ChoicesEnum
from kolibri.utils.time_utils import local_now
from kolibri.utils.version import truncate_version


def _filter_out_unsupported_fields(fields):
    return {k: v for (k, v) in fields.items() if NetworkLocation.has_field(k)}


def _uuid_string():
    return str(uuid.uuid4().hex)


class ConnectionStatus(ChoicesEnum):
    Unknown = "Unknown"
    # Connection failed at the lowest level, unable to establish socket connection
    ConnectionFailure = "ConnectionFailure"
    # Connection was established but timed out waiting for response
    ResponseTimeout = "ResponseTimeout"
    # Connection was established but the response is a server error (5xx)
    ResponseFailure = "ResponseFailure"
    # Connection was established but the response isn't right and isn't a server error
    InvalidResponse = "InvalidResponse"
    # Connection was established but the response didn't match information stored on our end
    Conflict = "Conflict"
    # A reachable Kolibri instance
    Okay = "Okay"


class LocationTypes(ChoicesEnum):
    # reserved locations like Studio and KDP
    Reserved = "reserved"
    # static locations added by the user
    Static = "static"
    # dynamic locations discovered by the Kolibri instance
    Dynamic = "dynamic"


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
        primary_key=True, max_length=36, default=_uuid_string, editable=False
    )
    location_type = models.CharField(
        max_length=8,
        blank=False,
        choices=LocationTypes.choices(),
        default=LocationTypes.Static,
    )

    base_url = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100, blank=True)
    # the last known IP when we successfully connected to the instance, specifically for static
    # locations, so we have information on whether it's local or on the internet
    last_known_ip = models.GenericIPAddressField(null=True, blank=True)
    # field to associate instances with a unique ID corresponding to a network that they were added
    broadcast_id = models.CharField(max_length=36, blank=True, null=True)

    # fields to track if the instance was contactable and the # of attempts or issues encountered
    connection_status = models.CharField(
        max_length=32,
        blank=False,
        choices=ConnectionStatus.choices(),
        default=ConnectionStatus.Unknown,
    )
    connection_faults = models.IntegerField(null=False, default=0)

    # these properties strictly mirror the info given by the device
    application = models.CharField(max_length=32, blank=True)
    kolibri_version = models.CharField(max_length=100, blank=True)
    instance_id = models.CharField(max_length=32, blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    operating_system = models.CharField(max_length=32, blank=True)
    subset_of_users_device = models.BooleanField(default=False)
    min_content_schema_version = models.CharField(max_length=32, blank=True, null=True)

    # dates and times
    added = models.DateTimeField(auto_now_add=True, db_index=True)
    last_accessed = models.DateTimeField(auto_now=True)

    # Determines whether device is local or on the internet
    is_local = models.BooleanField(default=False)

    def __init__(self, *args, **kwargs):
        super(NetworkLocation, self).__init__(*args, **kwargs)
        self._set_fields_for_type()

    def save(self, *args, **kwargs):
        self._set_fields_for_type()
        return super(NetworkLocation, self).save(*args, **kwargs)

    def _set_fields_for_type(self):
        """Abstract method to set fields for type"""
        pass

    @property
    def since_last_accessed(self):
        """
        :return: The number of seconds since the location was last accessed
        """
        return (local_now() - self.last_accessed).seconds

    @property
    def available(self):
        """
        If this connection was checked recently, report that result
        """
        if not self.base_url:
            return False

        return self.connection_status == ConnectionStatus.Okay

    @property
    def reserved(self):
        return self.location_type == LocationTypes.Reserved

    @property
    def is_kolibri(self):
        return self.application == "kolibri"

    @classmethod
    def has_field(cls, field):
        try:
            cls._meta.get_field(field)
            return True
        except FieldDoesNotExist:
            return False

    def matches_version(self, version):
        """
        Truncates the kolibri version to the patch level (0.16.0a1 -> 0.16.0) and compares it with
        version range, which can use operators `>` or `<` for comparing below or above a specified
        version
        :param version: the version filter with operators
        :return: a bool
        """
        return matches_version(truncate_version(self.kolibri_version), version)


class StaticNetworkLocationManager(models.Manager):
    def get_queryset(self):
        queryset = super(StaticNetworkLocationManager, self).get_queryset()
        return queryset.filter(location_type=LocationTypes.Static).all()


class StaticNetworkLocation(NetworkLocation):
    objects = StaticNetworkLocationManager()

    def _set_fields_for_type(self):
        self.location_type = LocationTypes.Static

    class Meta:
        proxy = True


class DynamicNetworkLocationManager(models.Manager):
    def get_queryset(self):
        queryset = super(DynamicNetworkLocationManager, self).get_queryset()
        return queryset.filter(location_type=LocationTypes.Dynamic).all()

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

    def _set_fields_for_type(self):
        self.location_type = LocationTypes.Dynamic
        self.is_local = True  # all dynamic locations are local

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
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


class PinnedDevice(models.Model):

    instance_id = UUIDField(blank=False)
    user = models.ForeignKey(FacilityUser, blank=False, on_delete=models.CASCADE)
    created = models.DateTimeField(default=timezone.now, db_index=True)

    permissions = IsOwn()

    class Meta:
        # Ensures that we do not save duplicates, otherwise raises a
        # django.db.utils.IntegrityError
        unique_together = (
            "user",
            "instance_id",
        )
