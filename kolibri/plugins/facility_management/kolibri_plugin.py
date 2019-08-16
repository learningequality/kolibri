from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.base import KolibriPluginBase


class FacilityManagementPlugin(KolibriPluginBase):
    translated_view_urls = "urls"

    def url_slug(self):
        return "^facility/"


class FacilityManagementAsset(WebpackBundleHook):
    bundle_id = "app"


class FacilityRedirect(RoleBasedRedirectHook):
    role = ADMIN

    @property
    def url(self):
        return self.plugin_url(FacilityManagementPlugin, "facility_management")


class FacilityManagementNavItem(NavigationHook, WebpackBundleHook):
    bundle_id = "side_nav"
