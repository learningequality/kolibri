from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.device.utils import get_device_setting
from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class UserProfile(KolibriPluginBase):
    translated_view_urls = "urls"

    @property
    def url_slug(self):
        return "profile"


@register_hook
class UserAuthAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        return {"isSubsetOfUsersDevice": get_device_setting("subset_of_users_device")}


@register_hook
class ProfileNavAction(NavigationHook):
    bundle_id = "user_profile_side_nav"
