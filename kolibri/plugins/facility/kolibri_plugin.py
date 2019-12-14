from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class FacilityManagementPlugin(KolibriPluginBase):
    translated_view_urls = "urls"


@register_hook
class FacilityManagementAsset(WebpackBundleHook):
    bundle_id = "app"


@register_hook
class FacilityRedirect(RoleBasedRedirectHook):
    roles = (ADMIN,)

    @property
    def url(self):
        return self.plugin_url(FacilityManagementPlugin, "facility_management")


@register_hook
class FacilityManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
