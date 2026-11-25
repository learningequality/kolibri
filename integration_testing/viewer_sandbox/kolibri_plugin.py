from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class ViewerSandbox(KolibriPluginBase):
    translated_view_urls = "urls"


@register_hook
class ViewerSandboxAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"
