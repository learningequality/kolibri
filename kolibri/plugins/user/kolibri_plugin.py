from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from . import hooks, urls


class User(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^user"


class UserAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "user_module"
    src_file = "assets/src/app.js"


class UserInclusionHook(hooks.UserSyncHook):
    bundle_class = UserAsset
