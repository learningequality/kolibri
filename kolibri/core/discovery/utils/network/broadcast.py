import json
import logging
import socket
import time
import uuid

from magicbus.base import Bus
from magicbus.plugins import SimplePlugin
from zeroconf import get_all_addresses
from zeroconf import ServiceInfo
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE

from kolibri.core.device.utils import get_device_info
from kolibri.core.discovery.hooks import NetworkDiscoveryHook
from kolibri.utils.conf import OPTIONS

SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"
TRUE = "TRUE"
FALSE = "FALSE"
DEFAULT_PORT = 8080
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

# the transport-agnostic channels the backend bus carries, each receiving a
# `KolibriInstance`
INSTANCE_EVENTS = [
    EVENT_REGISTER_INSTANCE,
    EVENT_RENEW_INSTANCE,
    EVENT_UNREGISTER_INSTANCE,
    EVENT_ADD_INSTANCE,
    EVENT_UPDATE_INSTANCE,
    EVENT_REMOVE_INSTANCE,
]

logger = logging.getLogger(__name__)


class KolibriInstance:
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
        "prefix",
        "last_seen",
    )

    def __init__(
        self, instance_id, ip=None, port=None, host=None, device_info=None, prefix="/"
    ):
        # Zeroconf wants socket.inet_aton() format, so make sure we have string with this class
        # which we convert when interfacing with Zeroconf
        if ip is not None and not isinstance(ip, str):
            raise TypeError("IP must be a string, not {}".format(type(ip)))

        self.id = instance_id
        self.zeroconf_id = instance_id
        self.ip = ip
        self.port = port
        self.host = host
        self.device_info = device_info or {}
        self.is_self = False
        self.service_info = None
        self.prefix = prefix
        self.last_seen = time.time()

    def __eq__(self, other):
        if self.id != other.id:
            return False
        if self.ip != other.ip:
            return False
        if self.port != other.port:
            return False
        if self.host != other.host:
            return False
        if self.device_info != other.device_info:
            return False
        if self.prefix != other.prefix:
            return False
        return True

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
        return "http://{ip}:{port}/{prefix}".format(
            ip=self.ip, port=self.port, prefix=self.prefix.lstrip("/")
        )

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
            if not isinstance(key, str):
                raise TypeError("Keys for the service info properties must be strings")
            if not isinstance(val, (str, int, bool)):
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
        properties["prefix"] = json.dumps(self.prefix)

        # convert to format Zeroconf wants
        address = socket.inet_aton(self.ip) if self.ip else None

        return ServiceInfo(
            SERVICE_TYPE,
            self.name,
            server=self.server,
            address=address,
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
        prefix = "/"
        for key, val in service_info.properties.items():
            if isinstance(val, bytes):
                val = val.decode("utf-8")
            key = bytes.decode(key)
            val = json.loads(val)
            if key == "prefix":
                prefix = val
                continue
            device_info[key] = val
            if device_info[key] == TRUE:
                device_info[key] = True
            if device_info[key] == FALSE:
                device_info[key] = False

        kwargs.update(
            ip=socket.inet_ntoa(service_info.address),
            port=service_info.port,
            host=service_info.server.strip("."),
            device_info=device_info,
            prefix=prefix,
        )

        instance_id = device_info.get("instance_id")
        instance = KolibriInstance(instance_id, **kwargs)
        instance.zeroconf_id = service_info.name.replace(SERVICE_TYPE, "").strip(".")
        return instance

    def to_dict(self):
        """
        :rtype: dict
        """
        return dict(
            id=self.id,
            ip=self.ip,
            port=self.port,
            host=self.host,
            device_info=self.device_info,
            is_self=self.is_self,
            prefix=self.prefix,
        )

    @classmethod
    def from_dict(cls, state):
        """
        :type state: dict
        :rtype: KolibriInstance
        """
        instance = cls(
            state.pop("id"),
            ip=state.pop("ip"),
            port=state.pop("port"),
            host=state.pop("host"),
            device_info=state.pop("device_info"),
            prefix=state.pop("prefix"),
        )
        instance.is_self = state.pop("is_self")
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
        ip=socket.inet_ntoa(USE_IP_OF_OUTGOING_INTERFACE),
        prefix=OPTIONS["Deployment"]["URL_PATH_PREFIX"],
    )


class KolibriInstanceListener(SimplePlugin):
    """
    Base class for network discovery listeners, which subscribe to a discovery
    event bus.
    """

    __slots__ = ("broadcast",)

    def __init__(self, broadcast):
        """
        :param broadcast: An object exposing an `events` bus, i.e. an
            `EventBusHost`
        """
        super().__init__(broadcast.events)
        self.broadcast = broadcast


class DiscoveryEventBus(Bus):
    # Provides better stack traces for errors when you list potential exception types here.
    # Adding `Exception` here will re-raise all errors, but making it easier to debug.
    throws = (Exception,)


class EventBusHost:
    """
    Mixin for objects that own an `events` bus and let `KolibriInstanceListener`
    subclasses subscribe to it.
    """

    __slots__ = ()

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


class NetworkDiscoveryBackend(EventBusHost):
    """
    Transport-agnostic network discovery machinery: broadcast-id lifecycle, the
    instance event bus, the `other_instances` dedup cache, and listener
    dispatch. It resolves its transport through `NetworkDiscoveryHook`, which
    calls back into `on_add`/`on_update`/`on_remove` as peers appear, change,
    and leave.
    """

    __slots__ = (
        "id",
        "instance",
        "events",
        "other_instances",
        "transport",
    )

    def __init__(self, instance):
        """
        :param instance: A `KolibriInstance` we'll advertise on the transport
        """
        self.id = uuid.uuid4().hex
        self.instance = instance
        self.events = DiscoveryEventBus(extra_channels=INSTANCE_EVENTS)
        self.other_instances = {}
        self.transport = None

    def start_broadcast(self):
        """
        Resolves the transport and starts advertising our instance and
        discovering peers.
        """
        if self.transport is not None:
            logger.error("Network discovery is already broadcasting!")
            return

        self.transport = NetworkDiscoveryHook.registered_hook
        if self.transport is None:
            # losing discovery must not take the server down with it
            logger.error("No network discovery transport registered")
            return
        try:
            # register our own instance before we start discovering peers, so the
            # transport has stored our instance before any peer event fires
            self.transport.register(self.instance)
        except Exception:
            # we never broadcast, so leave `transport` unset: the `STOP` that
            # follows would otherwise publish UNREGISTER, and the connection
            # reset that enqueues deletes every location, none of which was
            # discovered under this id
            transport, self.transport = self.transport, None
            if transport is not None:
                # and that same `STOP` was the only thing releasing what a
                # half-finished register left holding
                transport.stop_listening()
            raise
        if self.transport is None:
            # a `stop_broadcast()` landed while we were registering and has
            # already torn the transport down; starting to listen now would
            # bring it back up with nothing left to shut it down
            return
        # publish once the transport has settled our `zeroconf_id` and the
        # registration has succeeded, but before we start discovering peers, as
        # listeners rely on the register event preceding other network events
        self.events.publish(EVENT_REGISTER_INSTANCE, self.instance)
        self.transport.start_listening(
            self.on_add, self.on_update, self.on_remove, self.is_known
        )

    def update_broadcast(self, instance=None):
        """
        Updates our broadcast, optionally with a new `instance`, and lets the
        transport rebind to changed interfaces.

        :type instance: KolibriInstance
        """
        if self.transport is None:
            # `start_broadcast` never completed, so there's nothing to update
            return

        if instance is not None:
            instance.zeroconf_id = self.instance.zeroconf_id
            self.instance = instance
            self.events.publish(EVENT_RENEW_INSTANCE, self.instance)

        self.transport.update(instance, self.on_rebind)

    def on_rebind(self):
        """
        Invoked by the transport before it rebinds. The UNREGISTER below
        enqueues a connection reset that deletes every location not held under
        the current id, so the id has to cycle before the rebind starts
        rediscovering peers.
        """
        # a new ID every time the broadcast interfaces change
        new_id = uuid.uuid4().hex
        logger.debug(
            "Updating broadcast with new ID: {}, old ID: {}".format(new_id, self.id)
        )
        self.id = new_id
        # call the unregister listeners so that we enqueue necessary tasks to delete old
        # locations from the database
        self.events.publish(EVENT_UNREGISTER_INSTANCE, self.instance)

    def stop_broadcast(self):
        """Stops advertising our instance and discovering peers."""
        if self.transport is None:
            # publishing UNREGISTER for a broadcast id that never broadcast
            # would delete every DynamicNetworkLocation
            logger.error("Network discovery is not broadcasting!")
            return

        # very important to publish the event first, to avoid race conditions
        self.events.publish(EVENT_UNREGISTER_INSTANCE, self.instance)
        self.transport.unregister()
        self.transport.stop_listening()
        self.other_instances = {}
        self.transport = None

    def is_known(self, name):
        """
        Whether we already have a broadcasting instance cached for the service
        `name`, so the transport can skip re-querying it.

        :param name: A str of the service name
        """
        instance = self.other_instances.get(name)
        return instance is not None and instance.is_broadcasting

    def on_add(self, instance):
        """
        :param instance: A fully-built `KolibriInstance` with `is_self` set
        """
        if instance.is_self:
            return
        if self.is_known(instance.name):
            return
        self.other_instances[instance.name] = instance
        logger.info(
            "Kolibri instance '%s' joined the network; device info: %s"
            % (instance.zeroconf_id, instance.device_info)
        )
        self.events.publish(EVENT_ADD_INSTANCE, instance)

    def on_update(self, instance):
        """
        :param instance: A fully-built `KolibriInstance` with `is_self` set
        """
        if instance.is_self:
            return
        existing = self.other_instances.get(instance.name)
        if (
            existing is not None
            and existing == instance
            and instance.last_seen - existing.last_seen < SERVICE_TTL
        ):
            return
        self.other_instances[instance.name] = instance
        logger.info(
            "Kolibri instance '%s' updated on the network; device info: %s"
            % (instance.zeroconf_id, instance.device_info)
        )
        self.events.publish(EVENT_UPDATE_INSTANCE, instance)

    def on_remove(self, name):
        """
        :param name: A str of the service name; the removed service can no
            longer be queried, so we resolve the cached instance by name.
        """
        instance = self.other_instances.get(name)
        if instance is not None and not instance.is_self and instance.is_broadcasting:
            logger.info(
                "Kolibri instance '%s' has left the network." % (instance.zeroconf_id,)
            )
            # reset the broadcasting flag so a later on_add for the same name
            # re-publishes ADD (a leave→rejoin must re-announce the peer)
            instance.reset_broadcasting()
            self.events.publish(EVENT_REMOVE_INSTANCE, instance)
