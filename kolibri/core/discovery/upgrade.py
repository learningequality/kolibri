"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from django.db.utils import OperationalError

from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.upgrade import version_upgrade
from kolibri.deployment.default.sqlite_db_names import NETWORK_LOCATION

logger = logging.getLogger(__name__)


@version_upgrade(old_version="<0.15.0")
def move_network_location_entries():
    """
    Move network location entries from the default database to the new standalone database
    """
    source_queryset = NetworkLocation.objects.using("default").all()

    i = 0
    BATCH_SIZE = 1000
    try:
        while True:
            locations = source_queryset[i : i + BATCH_SIZE]
            NetworkLocation.objects.using(NETWORK_LOCATION).bulk_create(locations)
            if len(locations) < BATCH_SIZE:
                break
        source_queryset.delete()
    except OperationalError:
        # This will happen if the default database has not been migrated with the network location table
        # this may happen if we are upgrading from a version before the NetworkLocation model existed
        # and so the default database never had these migrations run on it.
        pass
