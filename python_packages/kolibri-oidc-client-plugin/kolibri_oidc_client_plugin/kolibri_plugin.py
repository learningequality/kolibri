from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user import hooks


class OpenIDConnect(KolibriPluginBase):
    root_view_urls = "root_urls"
    django_settings = "settings"
    kolibri_options = "options"


@register_hook
class LoginItem(webpack_hooks.WebpackBundleHook):
    bundle_id = "openid_login_item"


@register_hook
class LoginItemInclusionHook(hooks.UserSyncHook):
    bundle_class = LoginItem
