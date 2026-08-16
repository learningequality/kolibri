import logging
import re
import socket
from collections import namedtuple
from ipaddress import ip_address

from zeroconf import get_all_addresses
from zeroconf import InterfaceChoice
from zeroconf import NonUniqueNameException
from zeroconf import ServiceBrowser
from zeroconf import ServiceInfo
from zeroconf import ServiceStateChange
from zeroconf import Zeroconf

from kolibri.core.discovery.utils.network.broadcast import DEFAULT_PORT
from kolibri.core.discovery.utils.network.broadcast import DiscoveryEventBus
from kolibri.core.discovery.utils.network.broadcast import EventBusHost
from kolibri.core.discovery.utils.network.broadcast import KolibriInstance
from kolibri.core.discovery.utils.network.broadcast import SERVICE_TTL
from kolibri.core.discovery.utils.network.broadcast import SERVICE_TYPE
from kolibri.utils.conf import OPTIONS

SERVICE_RENAME_ATTEMPTS = 100

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

EVENT_UPDATE_LOCAL_NAMES = (
    "update_local_names"  # the `.local` hostnames we own have changed
)

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


def _drop_event(*args):
    """Default backend callback: a stale event has nowhere to go."""


def _nothing_known(name):
    """Default `is_known`: with no backend listening, nothing is cached."""
    return False


class ZeroconfNetworkDiscovery(EventBusHost):
    """
    The default zeroconf transport for network discovery: `Zeroconf`/
    `ServiceBrowser`/`ServiceInfo` handling, interface/address monitoring, and
    the `.local` name aliases. It turns discovered services into
    `KolibriInstance` objects and dispatches them to the backend callbacks
    stored by `start_listening`.

    Kept a plain class rather than the registered hook itself, so importing it
    doesn't trigger plugin registration; `kolibri/core/discovery/kolibri_plugin.py`
    registers a thin `NetworkDiscoveryHook` mix-in over it as the default.
    """

    def __init__(self):
        self.zeroconf = None
        self.instance = None
        self.local_names = {}
        # our own bus, kept separate from the backend's instance bus so
        # local-name concerns stay in the transport
        self.events = DiscoveryEventBus(extra_channels=[EVENT_UPDATE_LOCAL_NAMES])
        # backend callbacks, stored on start_listening
        self._reset_backend_callbacks()
        self._local_hostname_listener = None

    @property
    def interfaces(self):
        return (
            InterfaceChoice.All
            if OPTIONS["Deployment"]["LISTEN_ADDRESS"] == "0.0.0.0"
            else [OPTIONS["Deployment"]["LISTEN_ADDRESS"]]
        )

    @property
    def is_broadcasting(self):
        return self.zeroconf is not None

    @property
    def _addresses_changed(self):
        """Whether the host's addresses differ from the ones we're bound to."""
        # if we're bound to a specific address, then we don't need to do dynamic updates
        if OPTIONS["Deployment"]["LISTEN_ADDRESS"] != "0.0.0.0":
            return False
        if not self.is_broadcasting:
            return False
        return set(self.zeroconf.interfaces) != set(get_all_addresses())

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

    def _ensure_zeroconf(self):
        """Opens Zeroconf lazily, so whichever of register/start_listening runs first opens it."""
        if self.zeroconf is None:
            self.zeroconf = Zeroconf(interfaces=self.interfaces)

    def _ensure_local_hostname_listener(self):
        """
        Subscribes the local-hostname listener lazily, so merely instantiating
        this transport — which the plugin registry does in every process at
        `ready()` — doesn't import `discovery.tasks` and its models.
        """
        if self._local_hostname_listener is not None:
            return
        # imported here rather than at module top so that registering this
        # transport doesn't reach `discovery.tasks` either
        from kolibri.core.discovery.utils.network.local_hostnames import (
            LocalHostnameListener,
        )

        self._local_hostname_listener = self.add_listener(LocalHostnameListener)

    def register(self, instance):
        """Advertises `instance` on the network, renaming on a name conflict."""
        self._ensure_local_hostname_listener()
        self._ensure_zeroconf()
        self.instance = instance

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
        self._announce(service, do_broadcast)

        # even though may not have actually broadcast, we still set that we're broadcasting
        self.instance.set_broadcasting(service, is_self=True)
        lan_address = self._lan_alias_address()
        self._update_device_name_alias(lan_address)
        self._broadcast_local_names(do_broadcast, lan_address)
        self.events.publish(EVENT_UPDATE_LOCAL_NAMES, self.local_hostnames)

    def update(self, instance, on_rebind):
        """
        Re-advertises `instance` (when not None) and rebinds to changed
        interfaces if the host's addresses have changed.

        :type instance: KolibriInstance
        :param on_rebind: Called before we rebind, so the backend has cycled
            its broadcast id by the time the rebind rediscovers peers
        """
        # compute first: it decides whether we broadcast the renewal now (we
        # skip broadcasting if we're about to rebind interfaces anyway)
        addresses_changed = self._addresses_changed

        if instance is not None:
            self.instance = instance
            self.renew(do_broadcast=not addresses_changed)

        if addresses_changed:
            logger.info(
                "List of local addresses has changed since zeroconf was last initialized, updating now"
            )
            on_rebind()
            # `update_interfaces` will broadcast the new instance if it was updated
            self.zeroconf.update_interfaces(interfaces=self.interfaces)

    def unregister(self):
        """Stops advertising our instance and drops our `.local` aliases."""
        if not self.is_broadcasting:
            return

        if self.instance.service_info is not None:
            self.zeroconf.unregister_service(self.instance.service_info)
        for local_name in self.local_names.values():
            self.zeroconf.unregister_service(local_name.service)
        self.local_names = {}
        self.events.publish(EVENT_UPDATE_LOCAL_NAMES, self.local_hostnames)
        self.instance.reset_broadcasting()

    def start_listening(self, on_add, on_update, on_remove, is_known):
        """Begins discovering peers, dispatching built instances to the callbacks."""
        self._on_add = on_add
        self._on_update = on_update
        self._on_remove = on_remove
        self._is_known = is_known

        self._ensure_zeroconf()
        # manually add our service browser to Zeroconf so it's automatically cleaned up on close
        self.zeroconf.browsers["bus"] = ServiceBrowser(
            self.zeroconf,
            SERVICE_TYPE,
            handlers=[self._handle_service_change],
        )

    def stop_listening(self):
        """Stops discovering peers and closes Zeroconf."""
        if self.zeroconf is not None:
            self.zeroconf.close()
            self.zeroconf = None
        # drop references into the finished backend so this process-lifetime
        # singleton doesn't keep the old backend (and its buses/instance) alive
        self.instance = None
        # closing Zeroconf drops the alias registrations too, so this teardown
        # path clears them like `unregister()` does rather than leaving half
        self.local_names = {}
        self._reset_backend_callbacks()

    def _reset_backend_callbacks(self):
        """
        Points the backend callbacks at no-ops: a handler that passed
        `_is_current` while `Zeroconf.close()` was still joining dispatches
        once this has run, so they have to stay callable.
        """
        self._on_add = _drop_event
        self._on_update = _drop_event
        self._on_remove = _drop_event
        self._is_known = _nothing_known

    def _handle_service_change(self, zeroconf, service_type, name, state_change):
        """Zeroconf `ServiceBrowser` handler; dispatches to the backend callbacks."""
        if service_type != SERVICE_TYPE:
            return
        if not self._is_current(zeroconf):
            return
        # ignore events about our own service
        if self._is_own_service(name):
            return
        if state_change is ServiceStateChange.Added:
            self._added(zeroconf, name)
        elif state_change is ServiceStateChange.Updated:
            self._updated(zeroconf, name)
        elif state_change is ServiceStateChange.Removed:
            logger.debug("Received REMOVE event for Zeroconf service: {}".format(name))
            # a removed service can no longer be queried, so we hand the name to
            # the backend, which resolves the cached instance
            self._on_remove(name)

    def _is_current(self, zeroconf):
        """
        Whether `zeroconf` is still the one we're listening on.

        `Zeroconf.close()` joins the engine and reaper but not the browser
        threads, so an event queued — or a handler blocked in the 10s
        `get_service_info` — before a `stop_listening` still arrives after it.
        And this transport is a process-lifetime singleton, so a later
        `start_listening` repoints the backend callbacks at a new backend:
        dispatching a stale event then lands a peer from the previous
        broadcast in the next one.
        """
        return zeroconf is self.zeroconf

    def _is_own_service(self, name):
        return (
            self.instance is not None
            and self.instance.is_broadcasting
            and self.instance.service_info.name == name
        )

    def _added(self, zeroconf, name):
        logger.debug("Received ADD event for Zeroconf service: {}".format(name))
        # querying the service costs up to a 10s timeout, so skip it when the
        # backend already has this peer cached and broadcasting — it would
        # discard the result anyway
        if self._is_known(name):
            return
        service_info = self._get_service_info(name)
        # the query blocks for up to 10s, ample time for a `stop_listening`
        if not self._is_current(zeroconf) or service_info is None:
            return
        self._on_add(self._build_instance(service_info))

    def _updated(self, zeroconf, name):
        logger.debug("Received UPDATE event for Zeroconf service: {}".format(name))
        service_info = self._get_service_info(name)
        if not self._is_current(zeroconf):
            # stale, not gone — don't turn a stop into a removal
            return
        if service_info is None:
            # trying to update the instance but we couldn't find it so just remove it
            self._on_remove(name)
            return
        self._on_update(self._build_instance(service_info))

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

    def _build_instance(self, service_info):
        """
        Builds KolibriInstance object from Zeroconf service info
        :type service_info: ServiceInfo
        :rtype: KolibriInstance
        """
        instance = KolibriInstance.from_service_info(service_info)
        # a handler that passed `_is_current` reaches this once `stop_listening`
        # has nulled our own instance; nothing is our own service by then, and
        # the no-op callbacks drop what we build
        is_self = (
            self.instance is not None
            and instance.zeroconf_id == self.instance.zeroconf_id
        )
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
