from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.device.utils import get_device_setting
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class DeviceManagementPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"


@register_hook
class DeviceManagementAsset(WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        return {
            "isSubsetOfUsersDevice": get_device_setting(
                "subset_of_users_device", False
            ),
        }


@register_hook
class DeviceRedirect(RoleBasedRedirectHook):
    roles = (SUPERUSER,)

    @property
    def url(self):
        return self.plugin_url(DeviceManagementPlugin, "device_management")


@register_hook
class DeviceManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
