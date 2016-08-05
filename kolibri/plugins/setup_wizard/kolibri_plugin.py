from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks, urls


class SetupWizardPlugin(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^setupwizard/"


class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "setupwizard"
    src_file = "kolibri/plugins/setup_wizard/assets/src/app.js"
    static_dir = "kolibri/plugins/setup_wizard/static"


class SetupWizardInclusionHook(hooks.SetupWizardSyncHook):
    bundle_class = SetupWizardAsset
