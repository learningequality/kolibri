from __future__ import absolute_import, print_function, unicode_literals


from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class SentryPlugin(KolibriPluginBase):
    django_settings = "settings"
    kolibri_options = "options"


class SentryPluginAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "kolibri_sentry_plugin_module"
    src_file = "assets/src/module.js"


class SentryPluginInclusionHook(webpack_hooks.FrontEndBaseSyncHook):
    bundle_class = SentryPluginAsset
