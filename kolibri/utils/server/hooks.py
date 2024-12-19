from abc import abstractmethod

from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class KolibriProcessHook(KolibriHook):
    # A hook to add a magicbus plugin to the full server lifecycle

    @property
    @abstractmethod
    def MagicBusPluginClass(self):
        """
        The magicbus plugin class to use for this hook.
        The class may define methods for each of the server lifecycle states:
        - log
        - INITIAL
        - ENTER
        - IDLE
        - START
        - START_ERROR
        - RUN
        - SERVING
        - ZIP_SERVING
        - STOP
        - STOP_ERROR
        - EXIT
        - EXIT_ERROR
        - EXITED
        Can also set a relative priority for the plugin to run in the lifecycle
        by setting a priority property on the method.
        """
        pass
