import logging
import time

from django.core.exceptions import ValidationError
from django.db import connection
from django.db.utils import OperationalError

from kolibri.core.auth.models import FacilityUser
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener
from kolibri.core.discovery.utils.network.broadcast import NETWORK_EVENTS
from kolibri.core.public.utils import begin_request_soud_sync
from kolibri.core.public.utils import queue_soud_server_sync_cleanup
from kolibri.core.public.utils import stop_request_soud_sync

logger = logging.getLogger(__name__)


class DynamicNetworkLocationListener(KolibriInstanceListener):
    """
    Listener that subscribes to events to manage corresponding `DynamicNetworkLocation` models
    """

    def register_instance(self, instance):
        # when we start broadcasting, start fresh with no DynamicNetworkLocations
        DynamicNetworkLocation.objects.all().delete()
        connection.close()

    def unregister_instance(self, instance):
        # when we stop broadcasting, cleanup DynamicNetworkLocations
        DynamicNetworkLocation.objects.all().delete()
        connection.close()

    def add_instance(self, instance):
        # when a new instance appears, store it
        attempts = 0
        db_locked = True
        while db_locked and attempts <= 5:
            db_locked = self._store_instance(instance)
            attempts += 1
            time.sleep(0.1)

    def update_instance(self, instance):
        # add_instance uses update_or_create, so call again
        self.add_instance(instance)

    def remove_instance(self, instance):
        DynamicNetworkLocation.objects.filter(pk=instance.zeroconf_id).delete()
        connection.close()

    def _store_instance(self, instance):
        db_locked = False
        logger.debug(
            "Creating `DynamicNetworkLocation` for instance {}".format(instance.id)
        )
        try:
            DynamicNetworkLocation.objects.update_or_create(
                dict(base_url=instance.base_url, **instance.device_info),
                pk=instance.zeroconf_id,
            )
        except ValidationError:
            import traceback

            logger.warning(
                """
                    A new Kolibri instance '%s' was seen on the zeroconf network,
                    but we had trouble getting the information we needed about it.
                    Device info:
                    %s
                    The following exception was raised:
                    %s
                    """
                % (
                    instance.zeroconf_id,
                    instance.device_info,
                    traceback.format_exc(limit=1),
                )
            )
        except OperationalError as e:
            if "database is locked" not in str(e):
                raise
            logger.debug(
                "Encountered locked database while creating `DynamicNetworkLocation`"
            )
            db_locked = True
        finally:
            connection.close()
        return db_locked


class SoUDClientListener(KolibriInstanceListener):
    """
    Listener that subscribes to events when our instance is a SoUD
    """

    def _get_user_ids(self):
        return FacilityUser.objects.all().values_list("id", flat=True)

    def register_instance(self, instance):
        """
        When our instance is registered, we can pull out device information about ourselves
        """
        if not instance.device_info.get("subset_of_users_device", False):
            # if we're not SoUD, just unsubscribe
            self.partial_unsubscribe(NETWORK_EVENTS)

    def renew_instance(self, instance):
        """
        When our instance is renewed, it means we're updating the network with new information
        which could include a change in our SoUD status
        """
        if instance.device_info.get("subset_of_users_device", False):
            # when we weren't a SoUD but we are now, start requesting sync from all cached instances
            for other_instance in self.broadcast.other_instances.values():
                if other_instance.is_broadcasting:
                    self.add_instance(other_instance)
            self.partial_subscribe(NETWORK_EVENTS)
        else:
            self.partial_unsubscribe(NETWORK_EVENTS)

    def unregister_instance(self, instance):
        """
        When our local instance has been unregistered from the network, we can stop our requests
        for sync
        """
        if instance.device_info.get("subset_of_users_device", False):
            for other_instance in self.broadcast.other_instances.values():
                self.remove_instance(other_instance)

    def add_instance(self, instance):
        """
        When a network instance is removed, if it wasn't a SoUD, we stop sync requests for it
        """
        if not instance.device_info.get("subset_of_users_device", False):
            for user_id in self._get_user_ids():
                begin_request_soud_sync(instance.base_url, user_id)

    def update_instance(self, instance):
        """
        When a network instance is updated, triggering removal and addition
        """
        self.remove_instance(instance)
        self.add_instance(instance)

    def remove_instance(self, instance):
        """
        When a network instance is removed, if it wasn't a SoUD, we stop sync requests for it
        """
        if not instance.device_info.get("subset_of_users_device", False):
            for user_id in self._get_user_ids():
                stop_request_soud_sync(instance.base_url, user_id)


class SoUDServerListener(KolibriInstanceListener):
    """
    Listener that subscribes to events when our instance is NOT a SoUD
    """

    def register_instance(self, instance):
        """
        Upon registering ourselves, we can decide what events we really need to listen to
        """
        if instance.device_info.get("subset_of_users_device", False):
            self.partial_unsubscribe(NETWORK_EVENTS)

    def renew_instance(self, instance):
        """
        When the instance is renewed, device info may have changed, so we make sure our event
        subscription aligns with device state
        """
        if instance.device_info.get("subset_of_users_device", False):
            # if we're a SoUD, then we can unsubscribe
            self.partial_unsubscribe(NETWORK_EVENTS)
        else:
            self.partial_subscribe(NETWORK_EVENTS)

    def remove_instance(self, instance):
        """
        When a network instance is removed, if it was a SoUD, we trigger cleanup
        """
        if instance.device_info.get("subset_of_users_device", False):
            logger.debug("SoUD listener: triggering cleanup of SoUD sync")
            queue_soud_server_sync_cleanup(instance.ip)
