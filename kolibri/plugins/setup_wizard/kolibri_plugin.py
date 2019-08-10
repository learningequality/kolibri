from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.device.hooks import SetupHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class SetupWizardPlugin(KolibriPluginBase):
    translated_view_urls = "urls"

    def url_slug(self):
        return "^setup_wizard/"


class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "setup_wizard"


class SetupWizardHook(SetupHook):
    @property
    def url(self):
        return self.plugin_url(SetupWizardPlugin, "setupwizard")
