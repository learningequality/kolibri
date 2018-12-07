from kolibri.plugins.hooks import KolibriHook
from kolibri.plugins.utils import plugin_url


class SetupHook(KolibriHook):
    # A hook for a plugin to use to define a url to redirect to
    # when Kolibri has not yet been provisioned
    url = None

    def plugin_url(self, plugin_class, url_name):
        return plugin_url(plugin_class, url_name)

    class Meta:
        abstract = True
