import logging
import time

from django.core.exceptions import ValidationError
from django.db import connection
from django.db.utils import OperationalError
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE

from kolibri.core.auth.models import FacilityUser
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.discovery.utils.network.broadcast import InterfaceChoice
from kolibri.core.discovery.utils.network.broadcast import KolibriBroadcast
from kolibri.core.discovery.utils.network.broadcast import KolibriInstance
from kolibri.core.discovery.utils.network.broadcast import KolibriInstanceListener
from kolibri.core.public.utils import begin_request_soud_sync
from kolibri.core.public.utils import cleanup_server_soud_sync
from kolibri.core.public.utils import get_device_info
from kolibri.core.public.utils import stop_request_soud_sync

logger = logging.getLogger(__name__)


_ZEROCONF_BROADCAST = None
""":type: KolibriBroadcast|None"""


class DynamicNetworkLocationListener(KolibriInstanceListener):
    """
    Zeroconf listener that manages corresponding `DynamicNetworkLocation` models
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
            db_locked = True
        finally:
            connection.close()
        return db_locked


class SoUDListener(KolibriInstanceListener):
    """
    Zeroconf listener that handles SoUD sync requests for non-SoUD instances that appear on the
    network.
    """

    __slots__ = ("is_soud",)

    def __init__(self, broadcast):
        super(SoUDListener, self).__init__(broadcast)
        self.is_soud = None

    def _get_user_ids(self):
        return FacilityUser.objects.all().values_list("id", flat=True)

    def register_instance(self, instance):
        # when our instance is registered, we can pull out device information about ourselves
        self.is_soud = instance.device_info.get("subset_of_users_device", False)

    def renew_instance(self, instance):
        # when our instance is renewed, it means we're updating the network with new information
        # which could include a change in our SoUD status
        was_soud = self.is_soud
        is_soud = instance.device_info.get("subset_of_users_device", False)

        if was_soud and was_soud != is_soud:
            # this case shouldn't happen in practice but in the event we are no longer SoUD,
            # stop requesting sync for all instances
            for other_instance in self.broadcast.other_instances.values():
                self.remove_instance(other_instance)

        self.is_soud = is_soud

        if is_soud and was_soud != is_soud:
            # when we weren't a SoUD but we are now, start requesting sync from all cached instances
            for other_instance in self.broadcast.other_instances.values():
                if other_instance.is_broadcasting:
                    self.add_instance(other_instance)

    def unregister_instance(self, instance):
        # when we stop broadcasting, we should stop requesting a sync
        for other_instance in self.broadcast.other_instances.values():
            self.remove_instance(other_instance)
        self.is_soud = None

    def add_instance(self, instance):
        if self.is_soud and not instance.device_info.get(
            "subset_of_users_device", False
        ):
            for user_id in self._get_user_ids():
                begin_request_soud_sync(server=instance.base_url, user=user_id)

    def update_instance(self, instance):
        self.remove_instance(instance)
        self.add_instance(instance)

    def remove_instance(self, instance):
        if self.is_soud:
            if not instance.device_info.get("subset_of_users_device", False):
                for user_id in self._get_user_ids():
                    stop_request_soud_sync(server=instance.base_url, user=user_id)
        elif self.is_soud is not None:
            cleanup_server_soud_sync(instance.ip)


def _build_instance(port):
    """
    Builds our instance for broadcasting on the network with current device information
    """
    device_info = get_device_info()
    return KolibriInstance(
        device_info.get("instance_id"),
        port=port,
        device_info=device_info,
        ip=USE_IP_OF_OUTGOING_INTERFACE,
    )


def start_zeroconf_broadcast(port):
    """
    Instantiates the Zeroconf broadcast object, adds our listeners and starts broadcasting
    """
    global _ZEROCONF_BROADCAST

    if _ZEROCONF_BROADCAST is not None:
        return

    instance = _build_instance(port)
    _ZEROCONF_BROADCAST = KolibriBroadcast(instance)
    _ZEROCONF_BROADCAST.add_listener(DynamicNetworkLocationListener)
    _ZEROCONF_BROADCAST.add_listener(SoUDListener)
    _ZEROCONF_BROADCAST.start_broadcast()


def update_zeroconf_broadcast_instance():
    """
    Updates the Zeroconf broadcast with new information about our instance, suitable for when
    information in instance.device_info changes
    """
    global _ZEROCONF_BROADCAST
    if _ZEROCONF_BROADCAST is None:
        return

    instance = _build_instance(_ZEROCONF_BROADCAST.instance.port)
    _ZEROCONF_BROADCAST.update_broadcast(instance=instance)


def update_zeroconf_broadcast_interfaces():
    """
    Updates the Zeroconf broadcast by sending the all-interface choice which will ensure we're
    broadcasting on any new addresses if something has changed
    """
    global _ZEROCONF_BROADCAST
    if _ZEROCONF_BROADCAST is not None:
        _ZEROCONF_BROADCAST.update_broadcast(interfaces=InterfaceChoice.All)


def stop_zeroconf_broadcast():
    """
    Stops the Zeroconf broadcast and destroys the KolibriBroadcast instance
    """
    global _ZEROCONF_BROADCAST
    if _ZEROCONF_BROADCAST is not None:
        _ZEROCONF_BROADCAST.stop_broadcast()
    _ZEROCONF_BROADCAST = None


def get_zeroconf_broadcast_addresses():
    """
    :rtype: str[]
    """
    global _ZEROCONF_BROADCAST
    if _ZEROCONF_BROADCAST is not None:
        return _ZEROCONF_BROADCAST.addresses
    return []
