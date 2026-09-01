from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class NetworkLocationDiscoveryHook(KolibriHook):
    """
    A hook to allow plugins to register callbacks for events when discovering Kolibri instances
    """

    def on_connect(self, network_location):
        """
        Invoked when a network location becomes available on the network
        :param network_location: The `NetworkLocation` model for instance discovered and verified
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        pass

    def on_disconnect(self, network_location):
        """
        Invoked when a network location becomes unavailable on the network
        :param network_location: The `NetworkLocation` model for instance no long available
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        """
        pass


@define_hook
class NetworkLocationBroadcastHook(KolibriHook):
    @abstractmethod
    def on_renew(self, instance, network_locations):
        """
        Invoked when the current device's broadcast is renewed
        (i.e. the information in the broadcast changes)

        :param instance: The KolibriInstance for the current device
        :type instance: kolibri.core.discovery.utils.network.broadcast.KolibriInstance
        :param network_locations: The list of NetworkLocation models for
            other accessible Kolibri instances
        :type network_locations: kolibri.core.discovery.models.NetworkLocation[]
        """
        pass


@define_hook(only_one_registered=True)
class NetworkDiscoveryHook(KolibriHook):
    """
    A single-registration transport for network discovery. The default zeroconf
    transport is registered with `as_default=True`; a platform may override it.
    """

    @abstractmethod
    def register(self, instance):
        """Start advertising `instance` on this transport."""

    @abstractmethod
    def update(self, instance, on_rebind):
        """
        Re-advertise `instance` (when not None) and apply any transport rebind.

        Call `on_rebind()` before performing a rebind, not after: the backend
        cycles its broadcast id there, and a peer rediscovered by the rebind
        has to be enqueued under the incoming id.
        """

    @abstractmethod
    def unregister(self):
        """Stop advertising our instance."""

    @abstractmethod
    def start_listening(self, on_add, on_update, on_remove, is_known):
        """
        Begin discovering peers, dispatching KolibriInstances to the callbacks.

        `is_known(name)` reports whether the backend already has a broadcasting
        instance cached for a service name, so the transport can skip querying
        it again.
        """

    @abstractmethod
    def stop_listening(self):
        """Stop discovering peers and release transport resources."""
