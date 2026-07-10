import json
import logging
import re
import socket
import time
import uuid
from collections import namedtuple
from ipaddress import ip_address

from magicbus.base import Bus
from magicbus.plugins import SimplePlugin
from zeroconf import get_all_addresses
from zeroconf import InterfaceChoice
from zeroconf import NonUniqueNameException
from zeroconf import ServiceBrowser
from zeroconf import ServiceInfo
from zeroconf import ServiceStateChange
from zeroconf import USE_IP_OF_OUTGOING_INTERFACE
from zeroconf import Zeroconf

from kolibri.core.device.utils import get_device_info
from kolibri.utils.conf import OPTIONS

SERVICE_TYPE = "Kolibri._sub._http._tcp.local."
LOCAL_DOMAIN = "kolibri.local"
TRUE = "TRUE"
FALSE = "FALSE"
DEFAULT_PORT = 8080
SERVICE_RENAME_ATTEMPTS = 100
SERVICE_TTL = 60

LOCAL_TLD = "local"
# Registered under a private subtype (not SERVICE_TYPE), so these aliases
# stay invisible to Kolibri's own peer-discovery ServiceBrowser.
# Two distinct subtypes, so a device name that slugifies to "kolibri" gets
# its own `self.services` entry rather than overwriting the bare alias.
LOCAL_ALIAS_TYPE_BARE = "KolibriLocalBare._sub._http._tcp.local."
LOCAL_ALIAS_TYPE_DEVICE = "KolibriLocalDevice._sub._http._tcp.local."
BARE_LOCAL_LABEL = "kolibri"
LOCAL_NAME_BARE = "bare"
LOCAL_NAME_DEVICE = "device_name"

# The label the alias advertises (e.g. "kolibri" for the bare name, or the
# slugified device name) and the ServiceInfo registered for it. The label is
# kept so a device rename can be detected without re-parsing the hostname.
LocalName = namedtuple("LocalName", ["label", "service"])

EVENT_REGISTER_INSTANCE = (
    "register_instance"  # our local instance is registered on the network
)
EVENT_RENEW_INSTANCE = "renew_instance"  # our local instance is updated on the network
EVENT_UNREGISTER_INSTANCE = (
    "unregister_instance"  # our local instance is unregistered from network
)
EVENT_UPDATE_LOCAL_NAMES = (
    "update_local_names"  # the `.local` hostnames we own have changed
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
    EVENT_UPDATE_LOCAL_NAMES,
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

# zeroconf-py2compat's service_type_name() rejects a claimed name whose
# "<label>.<subtype>" portion exceeds 63 bytes (see LOCAL_ALIAS_TYPE_DEVICE
# in the local-name registration code); this cap keeps every slug safely
# under that ceiling.
MAX_DEVICE_NAME_LABEL_LENGTH = 32


def slugify_device_name(device_name):
    """
    Converts a free-form device name into a valid DNS label for a
    `<device-name>.local` hostname. Returns "" if nothing survives (e.g. an
    all-whitespace or non-ASCII name), signalling that no alias should be
    published.
    """
    slug = re.sub(r"[^a-z0-9-]", "", device_name.lower())
    return slug[:MAX_DEVICE_NAME_LABEL_LENGTH]


def filter_lan_addresses(addresses):
    """
    Filters `addresses` down to ones reachable from other devices on the
    same LAN, excluding loopback, link-local, and CGNAT/VPN ranges (e.g.
    Tailscale's 100.64.0.0/10) that a LAN peer can't reach.
    """
    lan_addresses = []
    for address in addresses:
        parsed = ip_address(address)
        if parsed.is_private and not parsed.is_loopback and not parsed.is_link_local:
            lan_addresses.append(address)
    return lan_addresses


def _packed_lan_address(lan_address):
    """Converts a LAN address string to the packed bytes Zeroconf wants, or None."""
    return socket.inet_aton(lan_address) if lan_address else None


def get_outgoing_interface_address():
    """
    Returns the source address the kernel would use to reach an off-subnet
    destination — i.e. this host's default-route ("outgoing") interface
    address — or `None` when there is no default route (e.g. an isolated LAN
    with no gateway). Connecting a UDP socket sends no packets; it just asks
    the routing table which local address a datagram to that destination
    would use.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 203.0.113.0/24 is TEST-NET-3 (RFC 5737): a globally-routed-looking
        # destination that matches the default route without being contacted.
        s.connect(("203.0.113.1", 9))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


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


class KolibriBroadcastEvents(Bus):
    """Event bus for handling events from Zeroconf"""

    # Provides better stack traces for errors when you list potential exception types here.
    # Adding `Exception` here will re-raise all errors, but making it easier to debug.
    throws = (Exception,)

    event_map = {
        ServiceStateChange.Added: EVENT_ADD_SERVICE,
        ServiceStateChange.Removed: EVENT_REMOVE_SERVICE,
        ServiceStateChange.Updated: EVENT_UPDATE_SERVICE,
    }

    def __init__(self):
        # keep it simple, `extra_channels` is the list of the events we need
        super().__init__(
            extra_channels=[
                # these receive a `KolibriInstance`
                EVENT_REGISTER_INSTANCE,
                EVENT_RENEW_INSTANCE,
                EVENT_UNREGISTER_INSTANCE,
                EVENT_ADD_INSTANCE,
                EVENT_UPDATE_INSTANCE,
                EVENT_REMOVE_INSTANCE,
                # this receives a list[str] of the `.local` hostnames we own
                EVENT_UPDATE_LOCAL_NAMES,
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
        super().__init__(broadcast.events)
        self.broadcast = broadcast


class KolibriBroadcast:
    """
    Responsible for handling Zeroconf service broadcast and listeners
    """

    __slots__ = (
        "id",
        "instance",
        "interfaces",
        "events",
        "other_instances",
        "zeroconf",
        "local_names",
    )

    def __init__(self, instance, interfaces=InterfaceChoice.All):
        """
        :param instance: A `KolibriInstance` we'll register and broadcast on Zeroconf
        :param interfaces: A list of addresses or a Zeroconf `InterfaceChoice`
        """
        self.id = uuid.uuid4().hex
        self.instance = instance
        self.interfaces = interfaces
        self.events = KolibriBroadcastEvents()
        self.other_instances = {}
        self.zeroconf = None
        self.local_names = {}

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

    @property
    def local_hostnames(self):
        """
        The `.local` hostnames this instance is advertising via mDNS, e.g.
        ["kolibri.local", "tonyslaptop.local"], for display as bookmarkable
        URLs.
        """
        return [
            local_name.service.server.rstrip(".")
            for local_name in self.local_names.values()
        ]

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
        # Check that the zeroconf attribute has not been set to None by a previous call to stop_broadcast
        if self.zeroconf is not None:
            self.zeroconf.browsers["bus"] = ServiceBrowser(
                self.zeroconf,
                SERVICE_TYPE,
                handlers=[self.events.publish_zeroconf_change],
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

        # nothing to do
        if instance is None and interfaces is None:
            return

        # when our instance is being updated
        if instance is not None:
            instance.zeroconf_id = self.instance.zeroconf_id
            self.instance = instance
            # skip broadcasting if we're also updating our interfaces
            self.renew(do_broadcast=interfaces is None)

        # when interfaces is being updated, pass along to Zeroconf so it can bind to them
        if interfaces is not None:
            # a new ID every time the broadcast interfaces change
            new_id = uuid.uuid4().hex
            logging.debug(
                "Updating broadcast with new ID: {}, old ID: {}".format(new_id, self.id)
            )
            self.id = new_id

            # call the unregister listeners so that we enqueue necessary tasks to delete old
            # locations from the database
            self.events.publish(EVENT_UNREGISTER_INSTANCE, self.instance)

            self.interfaces = interfaces
            # `update_interfaces` will broadcast the new instance if it was updated
            self.zeroconf.update_interfaces(interfaces=interfaces)

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
        self._register_local_names(self._lan_alias_address())
        self.events.publish(EVENT_UPDATE_LOCAL_NAMES, self.local_hostnames)

    def renew(self, do_broadcast=True):
        """
        'Renews' the registration of our instance on the network
        :param do_broadcast: Whether to broadcast the renewal or not
        :type do_broadcast: bool
        """
        if not self.is_broadcasting:
            return

        logger.info(
            "Updating ourselves to zeroconf network with id '{}' and port '{}'".format(
                self.instance.zeroconf_id, self.instance.port
            )
        )
        service = self.instance.to_service_info()
        # very important to publish the event first, to avoid race conditions
        self.events.publish(EVENT_RENEW_INSTANCE, self.instance)

        self._announce(service, do_broadcast)

        # even though may not have actually broadcast, we still set that we're broadcasting
        self.instance.set_broadcasting(service, is_self=True)
        lan_address = self._lan_alias_address()
        self._update_device_name_alias(lan_address)
        self._broadcast_local_names(do_broadcast, lan_address)
        self.events.publish(EVENT_UPDATE_LOCAL_NAMES, self.local_hostnames)

    def unregister(self):
        """
        Unregisters our instance from the network
        """
        if not self.is_broadcasting:
            return

        # very important to publish the event first, to avoid race conditions
        self.events.publish(EVENT_UNREGISTER_INSTANCE, self.instance)
        if self.instance.service_info is not None:
            self.zeroconf.unregister_service(self.instance.service_info)
        for local_name in self.local_names.values():
            self.zeroconf.unregister_service(local_name.service)
        self.local_names = {}
        self.events.publish(EVENT_UPDATE_LOCAL_NAMES, self.local_hostnames)
        self.instance.reset_broadcasting()

    def _announce(self, service, do_broadcast):
        """Broadcasts `service`, or just updates the local cache if `do_broadcast` is False."""
        service.ttl = SERVICE_TTL
        if do_broadcast:
            # update_service both updates the cache and broadcasts.
            self.zeroconf.update_service(service, ttl=SERVICE_TTL)
        else:
            self.zeroconf.services[service.name.lower()] = service

    def _lan_alias_address(self):
        """
        Returns a LAN-reachable address to advertise for the `.local` name
        aliases, or `None` if this host has none.

        Unlike the primary per-instance hostname — which relies on Zeroconf
        substituting each broadcast interface's own address (including non-LAN
        ones, e.g. a Tailscale CGNAT address) at send time via
        `USE_IP_OF_OUTGOING_INTERFACE` — these aliases are unique records that
        resolve to a single address, so a non-LAN interface address could be
        handed to a LAN peer that can't reach it.

        On a multi-homed host more than one RFC1918 address can survive the
        LAN filter (e.g. a real LAN address alongside a Docker/Hyper-V bridge),
        so we prefer the default-route (outgoing) interface's address — the
        same "primary interface" the per-instance hostname gets for free — and
        fall back to any other LAN-reachable address when the outgoing one
        isn't LAN-reachable (e.g. a VPN default route) or can't be determined
        (e.g. an isolated LAN with no gateway).
        """
        lan_addresses = filter_lan_addresses(get_all_addresses())
        # The outgoing-interface lookup opens a socket only to disambiguate a
        # multi-homed host; with 0 or 1 LAN address the result is identical
        # without it, so skip the syscall in that common case.
        if len(lan_addresses) > 1:
            outgoing_address = get_outgoing_interface_address()
            if outgoing_address in lan_addresses:
                return outgoing_address
        return min(lan_addresses, default=None)

    def _register_local_name(self, key, type_, label, lan_address):
        """
        Registers `<label>.local` as an A-record alias pointing at
        `lan_address`, under the alias `type_` rather than `SERVICE_TYPE`,
        storing it in `local_names` under `key` on success. These names are a
        best-effort convenience shortcut, not a unique identity: we make no
        attempt to keep them unique, so if a peer already advertises the same
        name we simply skip ours rather than renaming or contending for it.
        """
        server = ".".join([label, LOCAL_TLD, ""])
        service = ServiceInfo(
            type_,
            ".".join([label, type_]),
            server=server,
            address=_packed_lan_address(lan_address),
            port=self.instance.port or DEFAULT_PORT,
            properties={},
        )
        service.ttl = SERVICE_TTL
        try:
            self.zeroconf.register_service(service, ttl=service.ttl)
        except NonUniqueNameException:
            logger.info(
                "Local name '%s' is already claimed on the network; not advertising it",
                server.rstrip("."),
            )
            return
        self.local_names[key] = LocalName(label, service)

    def _register_local_names(self, lan_address):
        """Registers the bare `kolibri.local` name and the device-name alias."""
        self._register_local_name(
            LOCAL_NAME_BARE, LOCAL_ALIAS_TYPE_BARE, BARE_LOCAL_LABEL, lan_address
        )
        self._update_device_name_alias(lan_address)

    def _update_device_name_alias(self, lan_address):
        """
        Registers `<slugified-device-name>.local`, re-registering under a new
        label whenever the desired slug changes (e.g. after a device rename).
        Unregisters the alias entirely when the slug is empty.
        """
        slug = slugify_device_name(self.instance.device_info.get("device_name") or "")
        current = self.local_names.get(LOCAL_NAME_DEVICE)
        if current is not None:
            if current.label == slug:
                return
            self.zeroconf.unregister_service(current.service)
            del self.local_names[LOCAL_NAME_DEVICE]
        if slug:
            self._register_local_name(
                LOCAL_NAME_DEVICE, LOCAL_ALIAS_TYPE_DEVICE, slug, lan_address
            )

    def _broadcast_local_names(self, do_broadcast, lan_address):
        """Re-announces already-claimed local names, e.g. after a port or LAN address change."""
        address = _packed_lan_address(lan_address)
        for local_name in self.local_names.values():
            local_name.service.port = self.instance.port or DEFAULT_PORT
            local_name.service.address = address
            self._announce(local_name.service, do_broadcast)

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
            if name in self.other_instances:
                # if we already have the instance in our cache, we should check to
                # see if we actually have any updated information. If not, we can
                # just ignore the update
                current_instance = self.other_instances[name]
                if (
                    current_instance == instance
                    and instance.last_seen - current_instance.last_seen < SERVICE_TTL
                ):
                    return
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
