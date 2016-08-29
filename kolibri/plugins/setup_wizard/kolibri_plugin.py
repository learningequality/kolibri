from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks, urls


class SetupWizardPlugin(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^setup_wizard/"


class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "setup_wizard"
    src_file = "assets/src/app.js"


class SetupWizardInclusionHook(hooks.SetupWizardSyncHook):
    bundle_class = SetupWizardAsset
