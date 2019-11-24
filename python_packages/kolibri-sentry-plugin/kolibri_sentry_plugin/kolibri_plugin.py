from __future__ import absolute_import, print_function, unicode_literals


from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import conf


class SentryPlugin(KolibriPluginBase):
    django_settings = "settings"
    kolibri_options = "options"


@register_hook
class SentryPluginAsset(WebpackBundleHook):
    bundle_id = "main"

    @property
    def plugin_data(self):
        return {
            "sentryDSN": conf.OPTIONS["Debug"]["SENTRY_FRONTEND_DSN"],
            "sentryEnv": conf.OPTIONS["Debug"]["SENTRY_ENVIRONMENT"],
        }


@register_hook
class SentryPluginInclusionHook(FrontEndBaseSyncHook):
    bundle_class = SentryPluginAsset
