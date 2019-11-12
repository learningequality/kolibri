from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.device.hooks import SetupHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class SetupWizardPlugin(KolibriPluginBase):
    translated_view_urls = "urls"


@register_hook
class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"


@register_hook
class SetupWizardHook(SetupHook):
    @property
    def url(self):
        return self.plugin_url(SetupWizardPlugin, "setupwizard")
