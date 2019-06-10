from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.user import hooks


class OpenIDConnect(KolibriPluginBase):
    pass


class LoginItem(webpack_hooks.WebpackBundleHook):
    # inline = True
    unique_slug = "openid_login_item"
    src_file = "assets/src/views/OIDCLogin.vue"


class LoginItemInclusionHook(hooks.UserSyncHook):
    bundle_class = LoginItem
