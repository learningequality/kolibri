from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.user import hooks
from kolibri.plugins.hooks import register_hook


class DemoServer(KolibriPluginBase):
    pass


@register_hook
class DemoServerAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "main"


@register_hook
class DemoServerInclusionHook(hooks.UserSyncHook):
    bundle_class = DemoServerAsset
