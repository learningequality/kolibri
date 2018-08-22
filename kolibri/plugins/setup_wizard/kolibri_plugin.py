from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from . import hooks
from kolibri.core.device.hooks import SetupHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class SetupWizardPlugin(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^setup_wizard/"


class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "setup_wizard"
    src_file = "assets/src/app.js"


class SetupWizardInclusionHook(hooks.SetupWizardSyncHook):
    bundle_class = SetupWizardAsset


class SetupWizardHook(SetupHook):
    @property
    def url(self):
        return self.plugin_url(SetupWizardPlugin, 'setupwizard')
