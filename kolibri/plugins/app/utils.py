from django.core.urlresolvers import reverse

from kolibri.plugins.app.kolibri_plugin import App
from kolibri.plugins.registry import registered_plugins


SHARE_FILE = "share_file"

CAPABILITES = (SHARE_FILE,)


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

    def get_initialize_url(self, next_url=None):
        if not self.enabled:
            raise RuntimeError("App plugin is not enabled")
        # Import here to prevent a circular import
        from kolibri.core.device.models import DeviceAppKey

        url = reverse(
            "kolibri:kolibri.plugins.app:initialize", args=(DeviceAppKey.get_app_key(),)
        )
        if next_url is None:
            return url
        return url + "?next={}".format(next_url)

    @property
    def enabled(self):
        return App in registered_plugins

    @property
    def capabilities(self):
        if self.enabled:
            return {key: (key in self._capabilities) for key in CAPABILITES}
        return {key: False for key in CAPABILITES}

    def share_file(self, filename, message):
        if SHARE_FILE not in self._capabilities:
            raise NotImplementedError("Sharing files is not supported on this platform")
        return self._capabilities[SHARE_FILE](filename=filename, message=message)


interface = AppInterface()
