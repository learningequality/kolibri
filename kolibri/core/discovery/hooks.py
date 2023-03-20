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
