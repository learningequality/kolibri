import json
import logging
import socket
import threading

from six import integer_types
from six import string_types
from zeroconf import get_all_addresses
from zeroconf import InterfaceChoice
from zeroconf import NonUniqueNameException
from zeroconf import ServiceInfo
from zeroconf import Zeroconf


SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"
TRUE = "TRUE"
FALSE = "FALSE"
DEFAULT_PORT = 8080
SERVICE_RENAME_ATTEMPTS = 100
SERVICE_TTL = 60

logger = logging.getLogger(__name__)


class KolibriInstance(object):
    """
    Class representing network Kolibri instances, including this instance, on Zeroconf network
    """

    __slots__ = (
        "id",
        "zeroconf_id",
        "ip",
        "port",
        "host",
        "is_self",
        "device_info",
        "service_info",
    )

    def __init__(self, instance_id, ip=None, port=None, host=None, device_info=None):
        self.id = instance_id
        self.zeroconf_id = instance_id
        self.ip = ip
        self.port = port
        self.host = host
        self.device_info = device_info or {}
        self.is_self = False
        self.service_info = None

    @property
    def name(self):
        return ".".join([self.zeroconf_id, SERVICE_TYPE])

    @property
    def server(self):
        return ".".join([self.zeroconf_id, LOCAL_DOMAIN, ""])

    @property
    def local(self):
        return self.ip in get_all_addresses()

    @property
    def base_url(self):
        return "http://{ip}:{port}/".format(ip=self.ip, port=self.port)

    @property
    def is_broadcasting(self):
        return self.service_info is not None

    def set_broadcasting(self, service_info, is_self=False):
        """
        Mark this instance as broadcasting
        :type service_info: ServiceInfo
        :param is_self: A bool whether this instance is us
        """
        self.service_info = service_info
        self.is_self = is_self

    def reset_broadcasting(self):
        """Mark this instance as no longer broadcasting"""
        self.service_info = None

    def to_service_info(self, zeroconf_id=None):
        """
        Generates Zeroconf `ServiceInfo` object from instance data

        :param zeroconf_id: Override ID used to generate name for ServiceInfo
        """
        self.zeroconf_id = zeroconf_id or self.zeroconf_id
        properties = {}

        for key, val in self.device_info.items():
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
            properties[key] = json.dumps(val)

        return ServiceInfo(
            SERVICE_TYPE,
            self.name,
            server=self.server,
            address=self.ip,
            port=self.port or DEFAULT_PORT,
            properties=properties,
        )

    @classmethod
    def from_service_info(cls, service_info, **kwargs):
        """
        Parses Zeroconf `ServiceInfo` to create `KolibriInstance` object

        :type service_info: ServiceInfo
        :rtype: KolibriInstance
        """
        if not service_info.name.endswith(SERVICE_TYPE):
            raise AssertionError(
                "Invalid service name; must end with '%s'" % SERVICE_TYPE
            )

        # parse out device info
        device_info = {}
        for key, val in service_info.properties.items():
            if isinstance(val, bytes):
                val = val.decode("utf-8")
            device_info[bytes.decode(key)] = json.loads(val)
            if device_info[bytes.decode(key)] == TRUE:
                device_info[bytes.decode(key)] = True
            if device_info[bytes.decode(key)] == FALSE:
                device_info[bytes.decode(key)] = False

        kwargs.update(
            ip=socket.inet_ntoa(service_info.address),
            port=service_info.port,
            host=service_info.server.strip("."),
            device_info=device_info,
        )

        instance_id = device_info.get("instance_id")
        instance = KolibriInstance(instance_id, **kwargs)
        instance.zeroconf_id = service_info.name.replace(SERVICE_TYPE, "").strip(".")
        return instance


class KolibriInstanceListener(object):
    """
    Base class for Kolibri Zeroconf listeners
    """

    __slots__ = ("broadcast",)

    def __init__(self, broadcast):
        """
        :type broadcast: KolibriBroadcast
        """
        self.broadcast = broadcast

    def add_service(self, zeroconf, service_type, name):
        """
        Handle events for instances appearing on the network
        :param zeroconf: Zeroconf instance, we don't need it because self.broadcast has a copy
        :param service_type: type of service
        :param name: name of the service
        """
        # listeners should be triggered only for our type, but doesn't hurt to double check
        if service_type == SERVICE_TYPE:
            instance = self.broadcast.add_instance(name)
            if instance is not None:
                self.add_instance(instance)

    def update_service(self, zeroconf, service_type, name):
        """
        Handle events for instances updating themselves on the network
        :param zeroconf: Zeroconf instance, we don't need it because self.broadcast has a copy
        :param service_type: type of service
        :param name: name of the service
        """
        # listeners should be triggered only for our type, but doesn't hurt to double check
        if service_type == SERVICE_TYPE:
            instance = self.broadcast.update_instance(name)
            if instance is not None:
                self.update_instance(instance)

    def remove_service(self, zeroconf, service_type, name):
        """
        Handle events for instances disappearing on the network
        :param zeroconf: Zeroconf instance, we don't need it because self.broadcast has a copy
        :param service_type: type of service
        :param name: name of the service
        """
        # listeners should be triggered only for our type, but doesn't hurt to double check
        if service_type == SERVICE_TYPE:
            instance = self.broadcast.remove_instance(name)
            if instance is not None:
                self.remove_instance(instance)

    def register_instance(self, instance):
        """
        Triggered when we register our instance on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass

    def renew_instance(self, instance):
        """
        Triggered when we update our instance on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass

    def unregister_instance(self, instance):
        """
        Triggered when we unregister our instance on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass

    def add_instance(self, instance):
        """
        Triggered when a new instance appears on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass

    def update_instance(self, instance):
        """
        Triggered when an instance updates on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass

    def remove_instance(self, instance):
        """
        Triggered when an instance disappears on the Zeroconf network
        :type instance: KolibriInstance
        """
        pass


class KolibriBroadcast(object):
    """
    Responsible for handling Zeroconf service broadcast and listeners
    """

    __slots__ = (
        "instance",
        "interfaces",
        "other_instances",
        "listeners",
        "zeroconf",
        "lock",
    )

    def __init__(self, instance, interfaces=InterfaceChoice.All):
        """
        :param instance: A `KolibriInstance` we'll register and broadcast on Zeroconf
        :param interfaces: A list of addresses or a Zeroconf `InterfaceChoice`
        """
        self.instance = instance
        self.interfaces = interfaces
        self.other_instances = {}
        self.listeners = []
        self.zeroconf = None

        # for *_instance methods triggered from KolibriInstanceListener, we use a lock, because
        # otherwise the caching effect will have little benefit and our logging will be duplicated
        # as each is in a separate thread
        self.lock = threading.Lock()

    @property
    def is_broadcasting(self):
        return self.zeroconf is not None

    @property
    def addresses(self):
        """
        Current addresses on which we're broadcasting
        """
        if not self.is_broadcasting:
            return set()
        return set(self.zeroconf.interfaces)

    def start_broadcast(self):
        """
        Initializes Zeroconf and starts broadcasting our instance as a service
        """
        if self.is_broadcasting:
            logger.error("Zeroconf service already broadcasting!")
            return

        self.zeroconf = Zeroconf(interfaces=self.interfaces)
        for listener in self.listeners:
            self.zeroconf.add_service_listener(SERVICE_TYPE, listener)

        # register our instance so we start broadcasting
        self.register()

    def update_broadcast(self, instance=None, interfaces=None):
        """
        Updates the broadcast of our instance on the Zeroconf network, handling updates to our
        instance or updates to the interfaces we're broadcasting on

        :type instance: KolibriInstance
        :param interfaces: A list of addresses or a Zeroconf `InterfaceChoice`
        """
        if not self.is_broadcasting:
            logger.error("Zeroconf service is not broadcasting!")
            return

        # when interfaces is being updated, pass along to Zeroconf so it can bind to them
        if interfaces is not None:
            self.interfaces = interfaces
            self.zeroconf.update_interfaces(interfaces=interfaces)

        # when our instance is being updated,
        if instance is not None:
            instance.zeroconf_id = self.instance.zeroconf_id
            self.instance = instance
            self.renew()

    def stop_broadcast(self):
        """Stops broadcasting our instance and shuts down Zeroconf"""
        if not self.is_broadcasting:
            logger.error("Zeroconf service is not broadcasting!")
            return

        self.unregister()
        self.zeroconf.close()
        self.zeroconf = None
        self.other_instances = {}

    def register(self):
        """Registers our instance on the network"""
        if not self.is_broadcasting:
            return

        logger.info(
            "Registering ourselves to zeroconf network with id '{}' and port '{}'".format(
                self.instance.zeroconf_id, self.instance.port
            )
        )

        # determine the zeroconf_id for the instance on the network
        i = 1
        zeroconf_id = self.instance.zeroconf_id
        service = None
        while service is None:
            try:
                # check_service requires `service.ttl` to be set
                service = self.instance.to_service_info(zeroconf_id)
                service.ttl = SERVICE_TTL
                self.zeroconf.check_service(service, False)
            except NonUniqueNameException:
                # if there's a name conflict, append incrementing integer until no conflict
                zeroconf_id = "%s-%d" % (self.instance.id, i)
                service = None

            if i > SERVICE_RENAME_ATTEMPTS:
                raise NonUniqueNameException()

        # also does `check_service` internally, but it should pass by this point
        self.zeroconf.register_service(service, ttl=service.ttl)
        self.instance.set_broadcasting(service, is_self=True)
        for listener in self.listeners:
            listener.register_instance(self.instance)

    def renew(self):
        """
        'Renews' the registration of our instance on the network
        """
        if not self.is_broadcasting:
            return

        logger.info(
            "Updating ourselves to zeroconf network with id '{}' and port '{}'".format(
                self.instance.zeroconf_id, self.instance.port
            )
        )
        service = self.instance.to_service_info()
        self.zeroconf.update_service(service, ttl=SERVICE_TTL)
        self.instance.set_broadcasting(service, is_self=True)
        for listener in self.listeners:
            listener.renew_instance(self.instance)

    def unregister(self):
        """
        Unregisters our instance from the network
        """
        if not self.is_broadcasting:
            return

        self.zeroconf.unregister_service(self.instance.service_info)
        self.instance.reset_broadcasting()
        for listener in self.listeners:
            listener.unregister_instance(self.instance)

    def add_listener(self, listener_cls):
        """
        :type listener_cls: type[KolibriInstanceListener]
        """
        # helpful dev assertion, as this class calls methods on listeners
        assert issubclass(listener_cls, KolibriInstanceListener)
        listener = listener_cls(self)
        self.listeners.append(listener)
        if self.is_broadcasting:
            self.zeroconf.add_service_listener(SERVICE_TYPE, listener)

    def add_instance(self, name):
        """
        :param name: A str of the service name
        :return: The instance if found
        :rtype: KolibriInstance|None
        """
        with self.lock:
            # check for instance in our cache
            instance = self.other_instances.get(name)
            if instance is not None and instance.is_broadcasting:
                return instance

            # get information about the instance from Zeroconf
            service_info = self._get_service_info(name)
            if service_info is None:
                return None

            # build and save instance in cache
            instance = self._build_instance(service_info)
            if instance.is_self:
                return None

            self.other_instances[name] = instance
            logger.info(
                "Kolibri instance '%s' joined zeroconf network; device info: %s"
                % (instance.zeroconf_id, instance.device_info)
            )
            return instance

    def update_instance(self, name):
        """
        :param name: A str of the service name
        :return: The instance if found
        :rtype: KolibriInstance|None
        """
        with self.lock:
            # get information about the instance from Zeroconf
            service_info = self._get_service_info(name)
            if service_info is None:
                # trying to update the instance but we couldn't find it so just remove it
                return self.remove_instance(name, lock=False)

            instance = self._build_instance(service_info)
            if instance.is_self:
                return None

            self.other_instances[name] = instance
            logger.info(
                "Kolibri instance '%s' updated zeroconf network; device info: %s"
                % (instance.zeroconf_id, instance.device_info)
            )
            return instance

    def remove_instance(self, name, lock=True):
        """
        :param name: A str of the service name
        :param lock: A bool of whether to lock or not
        :return: The instance if found
        :rtype: KolibriInstance|None
        """
        if lock:
            with self.lock:
                return self._remove_instance(name)
        return self._remove_instance(name)

    def _remove_instance(self, name):
        """
        :param name: A str of the service name
        :return: The instance if found
        :rtype: KolibriInstance|None
        """
        instance = self.other_instances.get(name)
        if instance is not None:
            if not instance.is_self and instance.is_broadcasting:
                logger.info(
                    "Kolibri instance '%s' has left the zeroconf network."
                    % (instance.zeroconf_id,)
                )
                instance.reset_broadcasting()
            elif instance.is_self:
                return None
        return instance

    def _build_instance(self, service_info):
        """
        Builds KolibriInstance object from Zeroconf service info
        :type service_info: ServiceInfo
        :rtype: KolibriInstance
        """
        instance = KolibriInstance.from_service_info(service_info)
        is_self = instance.zeroconf_id == self.instance.zeroconf_id
        instance.set_broadcasting(service_info, is_self=is_self)
        return instance

    def _get_service_info(self, name):
        """
        Queries Zeroconf for info about a service by `name`
        :param: A str of the service name on the network
        :rtype: ServiceInfo
        """
        if not self.is_broadcasting:
            return None

        timeout = 10000
        service_info = self.zeroconf.get_service_info(
            SERVICE_TYPE, name, timeout=timeout
        )
        if service_info is None:
            logger.warning(
                "Zeroconf network service information could not be retrieved within {} seconds".format(
                    str(timeout / 1000.0)
                )
            )
        return service_info
