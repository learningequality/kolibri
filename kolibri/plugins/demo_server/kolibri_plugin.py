from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user_auth import hooks


class DemoServer(KolibriPluginBase):
    pass


@register_hook
class DemoServerAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "main"


@register_hook
class DemoServerInclusionHook(hooks.UserAuthSyncHook):
    bundle_class = DemoServerAsset
