from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class PingbackHook(KolibriHook):
    """
    A hook to allow plugins to respond to a successful pingback
    to the telemetry server.
    """

    @abstractmethod
    def pingback(self, server, pingback_id):
        """
        Called after a successful pingback, with the server that was
        pinged and the pingback id returned by the server.
        """
