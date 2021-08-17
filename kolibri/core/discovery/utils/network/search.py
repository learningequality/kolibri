import json
import logging
import socket
import time

from django.core.exceptions import ValidationError
from django.db import connection
from django.db.utils import OperationalError
from six import integer_types
from six import string_types
from zeroconf import get_all_addresses
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE
from zeroconf import Zeroconf

from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.models import DynamicNetworkLocation
from kolibri.core.public.utils import begin_request_soud_sync
from kolibri.core.public.utils import cleanup_server_soud_sync
from kolibri.core.public.utils import get_device_info
from kolibri.core.public.utils import stop_request_soud_sync

logger = logging.getLogger(__name__)

SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"
TRUE = "TRUE"
FALSE = "FALSE"

ZEROCONF_STATE = {
    "zeroconf": None,
    "listener": None,
    "service": None,
    "addresses": None,
    "port": None,
}


def _id_from_name(name):
    if not name.endswith(SERVICE_TYPE):
        raise AssertionError("Invalid service name; must end with '%s'" % SERVICE_TYPE)
    return name.replace(SERVICE_TYPE, "").strip(".")


class KolibriZeroconfService(object):

    info = None

    def __init__(self, id, port=8080, data=None):
        if data is None:
            data = {}
        self.id = id
        self.port = port
        self.data = {}
        for key, val in data.items():
            if not isinstance(key, string_types):
                raise TypeError("Keys for the service info properties must be strings")
            if not isinstance(val, string_types + integer_types + (bool,)):
                raise TypeError(
                    "Values for the service info properties must be a string, an integer or a boolean"
                )
            if isinstance(val, bool):
                # For some reason zeroconf coerces a JSON dumped boolean to a bool
                # So we set this to a special value so as not to break old versions of Kolibri which
                # will error when they try to json.loads a boolean value
                # TODO: No longer json.dumps at all here - but this will require making the zeroconf
                # info backwards incompatible with older versions of Kolibri
                val = TRUE if val else FALSE
            self.data[key] = json.dumps(val)

    def register(self):

        if not ZEROCONF_STATE["zeroconf"]:
            initialize_zeroconf_listener()

        if self.info is not None:
            logger.error("Service is already registered!")
            return

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

        if self.info is None:
            logging.error("Service is not registered!")
            return

        if self.info.name.lower() in ZEROCONF_STATE["zeroconf"].services:
            ZEROCONF_STATE["zeroconf"].unregister_service(self.info)

        self.info = None

    def cleanup(self, *args, **kwargs):

        if self.info and ZEROCONF_STATE["zeroconf"]:
            self.unregister()


def parse_device_info(info):
    obj = {}
    for key, val in info.properties.items():
        if isinstance(val, bytes):
            val = val.decode("utf-8")
        obj[bytes.decode(key)] = json.loads(val)
        if obj[bytes.decode(key)] == TRUE:
            obj[bytes.decode(key)] = True
        if obj[bytes.decode(key)] == FALSE:
            obj[bytes.decode(key)] = False
    return obj


def get_is_self(id):
    zeroconf_service = ZEROCONF_STATE.get("service")
    return zeroconf_service and zeroconf_service.id == id


class KolibriZeroconfListener(object):

    instances = {}

    def add_service(self, zeroconf, type, name):
        timeout = 10000
        info = zeroconf.get_service_info(type, name, timeout=timeout)
        if info is None:
            logger.warn(
                "Zeroconf network service information could not be retrieved within {} seconds".format(
                    str(timeout / 1000.0)
                )
            )
            return
        id = _id_from_name(name)
        ip = socket.inet_ntoa(info.address)

        base_url = "http://{ip}:{port}/".format(ip=ip, port=info.port)
        is_self = get_is_self(id)

        instance = {
            "id": id,
            "ip": ip,
            "local": ip in get_all_addresses(),
            "port": info.port,
            "host": info.server.strip("."),
            "base_url": base_url,
            "self": is_self,
        }

        device_info = parse_device_info(info)

        instance.update(device_info)
        self.instances[id] = instance

        if not is_self:

            logger.info(
                "Kolibri instance '%s' joined zeroconf network; service info: %s"
                % (id, self.instances[id])
            )

            db_locked = self.store_service(id, base_url, device_info)

            if get_device_setting(
                "subset_of_users_device", False
            ) and not device_info.get("subset_of_users_device", False):
                server = base_url[:-1]  # removes ending slash
                for user in FacilityUser.objects.all().values("id"):
                    begin_request_soud_sync(server=server, user=user["id"])

            attempts = 0
            while db_locked and attempts < 5:
                db_locked = self.store_service(id, base_url, device_info)
                attempts += 1
                time.sleep(0.1)

    def store_service(self, id, base_url, device_info):
        db_locked = False
        try:

            DynamicNetworkLocation.objects.update_or_create(
                dict(base_url=base_url, **device_info), id=id
            )

        except ValidationError:
            import traceback

            logger.warn(
                """
                    A new Kolibri instance '%s' was seen on the zeroconf network,
                    but we had trouble getting the information we needed about it.
                    Service info:
                    %s
                    The following exception was raised:
                    %s
                    """
                % (id, self.instances[id], traceback.format_exc(limit=1))
            )
        except OperationalError as e:
            if "database is locked" not in str(e):
                raise
            db_locked = True
        finally:
            connection.close()
        return db_locked

    def remove_service(self, zeroconf, type, name):
        id = _id_from_name(name)
        logger.info("Kolibri instance '%s' has left the zeroconf network." % (id,))

        try:
            if id in self.instances:
                if not get_is_self(id):
                    instance = self.instances[id]
                    is_soud = instance.get("subset_of_users_device", False)

                    if get_device_setting("subset_of_users_device", False):
                        if not is_soud:
                            for user in FacilityUser.objects.all().values("id"):
                                stop_request_soud_sync(
                                    server=instance.get("base_url"), user=user["id"]
                                )
                    elif is_soud:
                        # this means our device is not SoUD, and instance is a SoUD
                        cleanup_server_soud_sync(instance)

                del self.instances[id]
        except KeyError:
            pass

        DynamicNetworkLocation.objects.filter(pk=id).delete()
        connection.close()


def register_zeroconf_service(port=None):
    port = port or ZEROCONF_STATE["port"]
    device_info = get_device_info()
    DynamicNetworkLocation.objects.all().delete()
    connection.close()

    id = device_info.get("instance_id")

    if ZEROCONF_STATE["service"] is not None:
        unregister_zeroconf_service()

    logger.info(
        "Registering ourselves to zeroconf network with id '{}' and port '{}'".format(
            id, port
        )
    )
    data = device_info
    ZEROCONF_STATE["service"] = KolibriZeroconfService(id=id, port=port, data=data)
    ZEROCONF_STATE["service"].register()
    ZEROCONF_STATE["port"] = port


def unregister_zeroconf_service():
    if ZEROCONF_STATE["service"] is not None:
        ZEROCONF_STATE["service"].cleanup()
    ZEROCONF_STATE["service"] = None
    if ZEROCONF_STATE["zeroconf"] is not None:
        ZEROCONF_STATE["zeroconf"].close()
    ZEROCONF_STATE["zeroconf"] = None
    ZEROCONF_STATE["listener"] = None
    ZEROCONF_STATE["addresses"] = None
    ZEROCONF_STATE["port"] = None


def initialize_zeroconf_listener():
    ZEROCONF_STATE["zeroconf"] = Zeroconf()
    ZEROCONF_STATE["listener"] = KolibriZeroconfListener()
    ZEROCONF_STATE["zeroconf"].add_service_listener(
        SERVICE_TYPE, ZEROCONF_STATE["listener"]
    )
    ZEROCONF_STATE["addresses"] = set(get_all_addresses())


def get_peer_instances():
    try:
        return ZEROCONF_STATE["listener"].instances.values()
    except AttributeError:
        return []
