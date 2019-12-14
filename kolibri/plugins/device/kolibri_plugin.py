from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import SUPERUSER
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


@register_hook
class DeviceFirstTimeRedirect(RoleBasedRedirectHook):
    roles = (SUPERUSER,)
    first_login = True

    @property
    def url(self):
        return (
            self.plugin_url(DeviceManagementPlugin, "device_management") + "#/welcome"
        )


@register_hook
class DeviceManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
