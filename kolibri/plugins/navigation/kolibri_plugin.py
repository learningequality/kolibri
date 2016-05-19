from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class NavigationPlugin(KolibriPluginBase):
    """ Required boilerplate so that the module is recognized as a plugin """
    pass


class NavigationAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "navigation_module"
    src_file = "kolibri/plugins/navigation/assets/src/navigation.js"
    static_dir = "kolibri/plugins/navigation/static"


class NavigationInclusionHook(webpack_hooks.FrontEndBaseSyncHook):
    bundle_class = NavigationAsset
