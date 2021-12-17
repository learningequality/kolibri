import json
import logging
import socket

from magicbus.base import Bus
from magicbus.plugins import SimplePlugin
from six import integer_types
from six import string_types
from zeroconf import get_all_addresses
from zeroconf import InterfaceChoice
from zeroconf import NonUniqueNameException
from zeroconf import ServiceBrowser
from zeroconf import ServiceInfo
from zeroconf import ServiceStateChange
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE
from zeroconf import Zeroconf

from kolibri.core.public.utils import get_device_info


SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"
TRUE = "TRUE"
FALSE = "FALSE"
DEFAULT_PORT = 8080
SERVICE_RENAME_ATTEMPTS = 100
SERVICE_TTL = 60

EVENT_REGISTER_INSTANCE = (
    "register_instance"  # our local instance is registered on the network
)
EVENT_RENEW_INSTANCE = "renew_instance"  # our local instance is updated on the network
EVENT_UNREGISTER_INSTANCE = (
    "unregister_instance"  # our local instance is unregistered from network
)
EVENT_ADD_INSTANCE = "add_instance"  # a network instance is registered on the network
EVENT_UPDATE_INSTANCE = (
    "update_instance"  # a network instance is updated on the network
)
EVENT_REMOVE_INSTANCE = (
    "remove_instance"  # a network instance is removed from the network
)
EVENT_ADD_SERVICE = "add_service"  # a Zeroconf service is registered on the network
EVENT_UPDATE_SERVICE = "update_service"  # a Zeroconf service is updated on the network
EVENT_REMOVE_SERVICE = (
    "remove_service"  # a Zeroconf service is removed from the network
)

LOCAL_EVENTS = {
    EVENT_REGISTER_INSTANCE,
    EVENT_RENEW_INSTANCE,
    EVENT_UNREGISTER_INSTANCE,
}
NETWORK_EVENTS = {
    EVENT_ADD_SERVICE,
    EVENT_UPDATE_SERVICE,
    EVENT_REMOVE_SERVICE,
    EVENT_ADD_INSTANCE,
    EVENT_UPDATE_INSTANCE,
    EVENT_REMOVE_INSTANCE,
}

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


def build_broadcast_instance(port):
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


class KolibriBroadcastEvents(Bus):
    """Event bus for handling events from Zeroconf"""

    event_map = {
        ServiceStateChange.Added: EVENT_ADD_SERVICE,
        ServiceStateChange.Removed: EVENT_REMOVE_SERVICE,
        ServiceStateChange.Updated: EVENT_UPDATE_SERVICE,
    }

    def __init__(self):
        # keep it simple, `extra_channels` is the list of the events we need
        super(KolibriBroadcastEvents, self).__init__(
            extra_channels=[
                # these receive a `KolibriInstance`
                EVENT_REGISTER_INSTANCE,
                EVENT_RENEW_INSTANCE,
                EVENT_UNREGISTER_INSTANCE,
                EVENT_ADD_INSTANCE,
                EVENT_UPDATE_INSTANCE,
                EVENT_REMOVE_INSTANCE,
                # these receive a str name of the service
                EVENT_ADD_SERVICE,
                EVENT_UPDATE_SERVICE,
                EVENT_REMOVE_SERVICE,
            ],
        )

    def publish_zeroconf_change(self, zeroconf, service_type, name, state_change):
        """
        Publishes events to the broadcast bus when this method is called as a Zeroconf listener
        """
        if (
            service_type == SERVICE_TYPE
            and self.event_map.get(state_change) is not None
        ):
            self.publish(self.event_map[state_change], name)


class KolibriInstanceListener(SimplePlugin):
    """
    Base class for Kolibri Zeroconf listeners, which subscribe to events from the
    KolibriBroadcastEvents bus
    """

    __slots__ = ("broadcast",)

    def __init__(self, broadcast):
        """
        :type broadcast: KolibriBroadcast
        """
        super(KolibriInstanceListener, self).__init__(broadcast.events)
        self.broadcast = broadcast

    def partial_subscribe(self, events):
        """
        See similarity to SimplePlugin.subscribe()
        :param events: A list of string event names, matching methods on this class
        """
        for event in events:
            method = getattr(self, event, None)
            listeners = self.bus.listeners.get(event)
            if method is not None and method not in listeners:
                self.bus.subscribe(event, method)

    def partial_unsubscribe(self, events):
        """
        See similarity to SimplePlugin.unsubscribe()
        :param events: A list of string event names, matching methods on this class
        """
        for event in events:
            method = getattr(self, event, None)
            if method is not None:
                self.bus.unsubscribe(event, method)


class KolibriBroadcast(object):
    """
    Responsible for handling Zeroconf service broadcast and listeners
    """

    __slots__ = (
        "instance",
        "interfaces",
        "events",
        "other_instances",
        "zeroconf",
    )

    def __init__(self, instance, interfaces=InterfaceChoice.All):
        """
        :param instance: A `KolibriInstance` we'll register and broadcast on Zeroconf
        :param interfaces: A list of addresses or a Zeroconf `InterfaceChoice`
        """
        self.instance = instance
        self.interfaces = interfaces
        self.events = KolibriBroadcastEvents()
        self.other_instances = {}
        self.zeroconf = None

        # handle events from zeroconf, registered at broadcast start
        self.events.subscribe(EVENT_ADD_SERVICE, self.add_service)
        self.events.subscribe(EVENT_UPDATE_SERVICE, self.update_service)
        self.events.subscribe(EVENT_REMOVE_SERVICE, self.remove_service)

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

        # register our instance so we start broadcasting
        self.register()

        # manually add our service browser to Zeroconf so it's automatically cleaned up on close
        self.zeroconf.browsers["bus"] = ServiceBrowser(
            self.zeroconf, SERVICE_TYPE, handlers=[self.events.publish_zeroconf_change]
        )

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

        # very important to publish the event first, to avoid race conditions, as listeners
        # could rely on register event happening before other network events
        self.events.publish(EVENT_REGISTER_INSTANCE, self.instance)
        # also does `check_service` internally, but it should pass by this point
        self.zeroconf.register_service(service, ttl=service.ttl)
        self.instance.set_broadcasting(service, is_self=True)

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
        service.ttl = SERVICE_TTL
        # very important to publish the event first, to avoid race conditions
        self.events.publish(EVENT_RENEW_INSTANCE, self.instance)
        self.zeroconf.update_service(service, ttl=SERVICE_TTL)
        self.instance.set_broadcasting(service, is_self=True)

    def unregister(self):
        """
        Unregisters our instance from the network
        """
        if not self.is_broadcasting:
            return

        # very important to publish the event first, to avoid race conditions
        self.events.publish(EVENT_UNREGISTER_INSTANCE, self.instance)
        self.zeroconf.unregister_service(self.instance.service_info)
        self.instance.reset_broadcasting()

    def add_listener(self, listener_cls):
        """
        :type listener_cls: type[KolibriInstanceListener]
        :return: The listener class instance
        """
        # helpful dev assertion, as this class calls methods on listeners
        assert issubclass(listener_cls, KolibriInstanceListener)
        listener = listener_cls(self)
        listener.subscribe()
        return listener

    def add_service(self, name):
        """
        :param name: A str of the service name
        """
        # ignore events about ourselves
        if self.instance.is_broadcasting and self.instance.service_info.name == name:
            return

        logger.debug("Received ADD event for Zeroconf service: {}".format(name))

        # check for instance in our cache
        instance = self.other_instances.get(name)
        if instance is not None and instance.is_broadcasting:
            return

        # get information about the instance from Zeroconf
        service_info = self._get_service_info(name)
        if service_info is None:
            return

        # build and save instance in cache
        instance = self._build_instance(service_info)

        if not instance.is_self:
            self.other_instances[name] = instance
            logger.info(
                "Kolibri instance '%s' joined zeroconf network; device info: %s"
                % (instance.zeroconf_id, instance.device_info)
            )
            self.events.publish(EVENT_ADD_INSTANCE, instance)

    def update_service(self, name):
        """
        :param name: A str of the service name
        """
        # ignore events about ourselves
        if self.instance.is_broadcasting and self.instance.service_info.name == name:
            return

        logger.debug("Received UPDATE event for Zeroconf service: {}".format(name))

        # get information about the instance from Zeroconf
        service_info = self._get_service_info(name)
        if service_info is None:
            # trying to update the instance but we couldn't find it so just remove it
            return self.remove_service(name)

        instance = self._build_instance(service_info)
        if not instance.is_self:
            self.other_instances[name] = instance
            logger.info(
                "Kolibri instance '%s' updated zeroconf network; device info: %s"
                % (instance.zeroconf_id, instance.device_info)
            )
            self.events.publish(EVENT_UPDATE_INSTANCE, instance)

    def remove_service(self, name):
        """
        :param name: A str of the service name
        """
        # ignore events about ourselves
        if self.instance.is_broadcasting and self.instance.service_info.name == name:
            return

        logger.debug("Received REMOVE event for Zeroconf service: {}".format(name))

        instance = self.other_instances.get(name)
        if instance is not None and not instance.is_self and instance.is_broadcasting:
            logger.info(
                "Kolibri instance '%s' has left the zeroconf network."
                % (instance.zeroconf_id,)
            )
            instance.reset_broadcasting()
            self.events.publish(EVENT_REMOVE_INSTANCE, instance)

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

        logger.debug("Querying service information for service {}".format(name))
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
