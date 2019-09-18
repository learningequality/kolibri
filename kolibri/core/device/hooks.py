from abc import abstractproperty

from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.utils import plugin_url


@define_hook
class SetupHook(KolibriHook):
    # A hook for a plugin to use to define a url to redirect to
    # when Kolibri has not yet been provisioned
    @abstractproperty
    def url(self):
        pass

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)
