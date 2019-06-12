from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf import settings

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.openid_connect.openid_connect_settings import OIDC_SETTINGS
from kolibri.plugins.user import hooks


class OpenIDConnect(KolibriPluginBase):
    def __init__(self):
        for name, value in OIDC_SETTINGS.items():
            setattr(settings, name, value)


class LoginItem(webpack_hooks.WebpackBundleHook):
    # inline = True
    unique_slug = "openid_login_item"
    src_file = "assets/src/views/OIDCLogin.vue"


class LoginItemInclusionHook(hooks.UserSyncHook):
    bundle_class = LoginItem
