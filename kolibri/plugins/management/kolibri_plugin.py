from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class ManagementPlugin(KolibriPluginBase):
    """ Required boilerplate so that the module is recognized as a plugin """
    pass


class ManagementAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "management_module"
    src_file = "kolibri/plugins/management/assets/src/management.js"
    static_dir = "kolibri/plugins/management/static"


class ManagementInclusionHook(webpack_hooks.FrontEndBaseSyncHook):
    bundle_class = ManagementAsset
