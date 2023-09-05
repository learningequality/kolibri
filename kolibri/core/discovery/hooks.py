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
