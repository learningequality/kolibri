import atexit
import json
import logging
import os
import socket
import time
from contextlib import closing

from diskcache import Cache
from django.conf import settings
from zeroconf import get_all_addresses
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE
from zeroconf import Zeroconf

import kolibri
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.utils.conf import KOLIBRI_HOME

logger = logging.getLogger(__name__)

SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"

ZEROCONF_STATE = {"zeroconf": None, "listener": None, "service": None}

ZEROCONF_MIN_ALLOWED_REFRESH = getattr(settings, "ZEROCONF_MIN_ALLOWED_REFRESH")

# ZeroConf cache keys
ZEROCONF_SERVICE_ID = "ZEROCONF_SERVICE_ID"
ZEROCONF_DISCOVERIES_ARE_FRESH = "ZEROCONF_DISCOVERIES_ARE_FRESH"


def _id_from_name(name):
    assert name.endswith(SERVICE_TYPE), (
        "Invalid service name; must end with '%s'" % SERVICE_TYPE
    )
    return name.replace(SERVICE_TYPE, "").strip(".")


def _is_port_open(host, port, timeout=1):
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


class KolibriZeroconfService(object):

    info = None

    def __init__(self, id, port=8080, data={}):
        self.id = id
        self.port = port
        self.data = {key: json.dumps(val) for (key, val) in data.items()}

        atexit.register(self.cleanup)

    def register(self):

        if not ZEROCONF_STATE["zeroconf"]:
            initialize_zeroconf_listener()

        assert self.info is None, "Service is already registered!"

        i = 1
        id = self.id

        while not self.info:

            # attempt to create an mDNS service and register it on the network
            try:
                info = ServiceInfo(
                    SERVICE_TYPE,
                    name=".".join([id, SERVICE_TYPE]),
                    server=".".join([id, LOCAL_DOMAIN, ""]),
                    address=USE_IP_OF_OUTGOING_INTERFACE,
                    port=self.port,
                    properties=self.data,
                )

                ZEROCONF_STATE["zeroconf"].register_service(info, ttl=60)

                self.info = info

            except NonUniqueNameException:
                # if there's a name conflict, append incrementing integer until no conflict
                i += 1
                id = "%s-%d" % (self.id, i)

            if i > 100:
                raise NonUniqueNameException()

        self.id = id

        return self

    def unregister(self):

        assert self.info is not None, "Service is not registered!"

        ZEROCONF_STATE["zeroconf"].unregister_service(self.info)

        self.info = None

    def cleanup(self, *args, **kwargs):

        if self.info and ZEROCONF_STATE["zeroconf"]:
            self.unregister()


class KolibriZeroconfListener(object):

    instances = {}

    def add_service(self, zeroconf, type, name):
        info = zeroconf.get_service_info(type, name)
        id = _id_from_name(name)
        ip = socket.inet_ntoa(info.address)

        self.instances[id] = {
            "id": id,
            "ip": ip,
            "local": ip in get_all_addresses(),
            "port": info.port,
            "host": info.server.strip("."),
            "data": {
                bytes.decode(key): json.loads(val)
                for (key, val) in info.properties.items()
            },
            "base_url": "http://{ip}:{port}/".format(ip=ip, port=info.port),
            "self": id == cache.get(ZEROCONF_SERVICE_ID),
        }
        logger.info(
            "Kolibri instance '%s' joined zeroconf network; service info: %s\n"
            % (id, self.instances[id])
        )

    def remove_service(self, zeroconf, type, name):
        id = _id_from_name(name)
        logger.info("\nKolibri instance '%s' has left the zeroconf network.\n" % (id,))
        if id in self.instances:
            del self.instances[id]


cache = Cache(os.path.join(KOLIBRI_HOME, "zeroconf_cache"))


def get_peer_instances():
    """Retrieve a list of dicts with information about the discovered Kolibri instances on the local network,
    filtering out those that can't be accessed at the specified port (via attempting to open a socket)."""
    if not ZEROCONF_STATE["listener"]:
        initialize_zeroconf_listener()
        time.sleep(3)

    return list(ZEROCONF_STATE["listener"].instances.values())


def run_peer_discovery(timeout=2, include_local=True):
    """Find peer Kolibri instances, check their availability then add them to the database.
    Returns `True` if a fresh scan happened, otherwise returns `False`."""

    discoveries_are_fresh = cache.get(ZEROCONF_DISCOVERIES_ARE_FRESH)

    if discoveries_are_fresh:
        # a queryset pointing at already discovered addresses
        return False
    else:

        for instance in get_peer_instances():
            if instance["local"] and not include_local:
                continue

            if instance["self"]:
                continue

            try:
                (
                    network_location,
                    created,
                ) = DynamicNetworkLocation.objects.update_or_create(
                    dict(base_url=instance.get("base_url")),
                    id=instance.get("data").get("instance_id"),
                )

            except NetworkLocationNotFound:
                logger.info(
                    "The device with id %s could no longer be reached" % instance["id"]
                )

        cache.set(ZEROCONF_DISCOVERIES_ARE_FRESH, True, ZEROCONF_MIN_ALLOWED_REFRESH)
        return True


def register_zeroconf_service(port, id):
    short_id = id[:4]
    DynamicNetworkLocation.objects.purge()  # cleanup old dynamic network locations
    cache.set(ZEROCONF_SERVICE_ID, short_id)
    if ZEROCONF_STATE["service"] is not None:
        unregister_zeroconf_service()
    logger.info("Registering ourselves to zeroconf network with id '%s'..." % short_id)
    data = {
        "version": kolibri.VERSION,
        "instance_id": id,
    }
    ZEROCONF_STATE["service"] = KolibriZeroconfService(
        id=short_id, port=port, data=data
    )
    ZEROCONF_STATE["service"].register()


def unregister_zeroconf_service():
    if ZEROCONF_STATE["service"] is not None:
        ZEROCONF_STATE["service"].cleanup()
    ZEROCONF_STATE["service"] = None

    cache.set(ZEROCONF_SERVICE_ID, None)
    cache.set(ZEROCONF_DISCOVERIES_ARE_FRESH, False)


def initialize_zeroconf_listener():
    ZEROCONF_STATE["zeroconf"] = Zeroconf()
    ZEROCONF_STATE["listener"] = KolibriZeroconfListener()
    ZEROCONF_STATE["zeroconf"].add_service_listener(
        SERVICE_TYPE, ZEROCONF_STATE["listener"]
    )
