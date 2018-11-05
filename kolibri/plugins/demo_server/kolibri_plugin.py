from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.user import hooks


class DemoServer(KolibriPluginBase):
    pass


class DemoServerAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "demo_server_module"
    src_file = "assets/src/module.js"


class DemoServerInclusionHook(hooks.UserSyncHook):
    bundle_class = DemoServerAsset
