from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks, urls


class ManagementPlugin(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^management/"


class ManagementAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "management_module"
    src_file = "kolibri/plugins/management/assets/src/management.js"
    static_dir = "kolibri/plugins/management/static"


class ManagementInclusionHook(hooks.ManagementSyncHook):
    bundle_class = ManagementAsset
