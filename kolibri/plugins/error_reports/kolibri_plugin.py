from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class ErrorReportsPlugin(KolibriPluginBase):
    """
    A plugin to capture and report errors in Kolibri.
    """

    untranslated_view_urls = "api_urls"


@register_hook
class ErrorReportsPluginAsset(WebpackBundleHook):
    bundle_id = "main"


@register_hook
class ErrorReportsPluginInclusionHook(FrontEndBaseSyncHook):
    bundle_class = ErrorReportsPluginAsset
