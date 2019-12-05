import atexit
import json
import logging
import os
import socket
from contextlib import closing

from diskcache import Cache
from diskcache import Index
from zeroconf import get_all_addresses
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE
from zeroconf import Zeroconf

from kolibri.utils.conf import KOLIBRI_HOME

logger = logging.getLogger(__name__)

SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"

ZEROCONF_STATE = {"zeroconf": None, "listener": None, "service": None}

# ZeroConf cache stuff
ZEROCONF_SERVICE_ID = "ZEROCONF_SERVICE_ID"
ZEROCONF_SELF_INSTANCE = "ZEROCONF_SELF_INSTANCE"

discovery_index = Index(os.path.join(KOLIBRI_HOME, "zeroconf", "index"),)

meta_cache = Cache(os.path.join(KOLIBRI_HOME, "zeroconf", "meta"),)


def get_peer_instances():
    return discovery_index.values()


def get_peer_instance(instance_id):
    return discovery_index[instance_id]


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

        base_url = "http://{ip}:{port}/".format(ip=ip, port=info.port)
        is_self = id == meta_cache.get(ZEROCONF_SERVICE_ID)

        instance = {
            "id": id,
            "ip": ip,
            "local": ip in get_all_addresses(),
            "port": info.port,
            "host": info.server.strip("."),
            "base_url": base_url,
            "self": is_self,
        }

        instance.update(
            {
                bytes.decode(key): json.loads(val)
                for (key, val) in info.properties.items()
            }
        )

        if not is_self:
            self.instances[id] = instance

            discovery_index[id] = instance

            logger.info(
                "Kolibri instance '%s' joined zeroconf network; service info: %s\n"
                % (id, self.instances[id])
            )
        else:
            self.self_instance = instance
            meta_cache.set(ZEROCONF_SELF_INSTANCE, instance)

    def remove_service(self, zeroconf, type, name):
        id = _id_from_name(name)
        logger.info("\nKolibri instance '%s' has left the zeroconf network.\n" % (id,))

        try:
            if id in self.instances:
                del self.instances[id]
        except KeyError:
            pass

        try:
            del discovery_index[id]
        except KeyError:
            pass


def register_zeroconf_service(port, device_info):
    id = device_info.get("instance_id")

    meta_cache.set(ZEROCONF_SERVICE_ID, id)
    discovery_index.clear()

    if ZEROCONF_STATE["service"] is not None:
        unregister_zeroconf_service()
    logger.info("Registering ourselves to zeroconf network with id '%s'..." % id)
    data = device_info
    ZEROCONF_STATE["service"] = KolibriZeroconfService(id=id, port=port, data=data)
    ZEROCONF_STATE["service"].register()


def unregister_zeroconf_service():
    if ZEROCONF_STATE["service"] is not None:
        ZEROCONF_STATE["service"].cleanup()
    ZEROCONF_STATE["service"] = None

    meta_cache.clear()
    discovery_index.clear()


def initialize_zeroconf_listener():
    ZEROCONF_STATE["zeroconf"] = Zeroconf()
    ZEROCONF_STATE["listener"] = KolibriZeroconfListener()
    ZEROCONF_STATE["zeroconf"].add_service_listener(
        SERVICE_TYPE, ZEROCONF_STATE["listener"]
    )
