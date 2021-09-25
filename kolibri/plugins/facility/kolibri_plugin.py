from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.device.utils import get_device_setting
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class FacilityManagementPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"

    @property
    def translated_view_urls(self):
        # On an SoUD this plugin should be disabled. In lieu of properly
        # disabling the plugin, we will just not register any urls for now
        if not get_device_setting("subset_of_users_device", False):
            return "urls"
        return None


@register_hook
class FacilityManagementAsset(WebpackBundleHook):
    bundle_id = "app"


@register_hook
class FacilityRedirect(RoleBasedRedirectHook):
    roles = (ADMIN,)

    @property
    def url(self):
        # Also disable attempting to redirect to the facility management page
        # if we are on a subset of users device.
        if not get_device_setting("subset_of_users_device", False):
            return self.plugin_url(FacilityManagementPlugin, "facility_management")


@register_hook
class FacilityManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
