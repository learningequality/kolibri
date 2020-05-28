from kolibri.plugins.app.kolibri_plugin import App
from kolibri.plugins.registry import registered_plugins


LAUNCH_INTENT = "launch_intent"

CAPABILITES = (LAUNCH_INTENT,)


class AppInterface(object):
    __slot__ = "_capabilities"

    def __init__(self):
        self._capabilities = {}

    def __contains__(self, capability):
        return capability in self._capabilities

    def register(self, **kwargs):
        for capability in CAPABILITES:
            if capability in kwargs:
                self._capabilities[capability] = kwargs[capability]

    @property
    def enabled(self):
        return App in registered_plugins

    @property
    def capabilities(self):
        if self.enabled:
            return {key: (key in self._capabilities) for key in CAPABILITES}
        return {key: False for key in CAPABILITES}

    def launch_intent(self, filename, message):
        if LAUNCH_INTENT not in self._capabilities:
            raise NotImplementedError(
                "Launching intents is not supported on this platform"
            )
        return self._capabilities[LAUNCH_INTENT](filename=filename, message=message)


interface = AppInterface()
