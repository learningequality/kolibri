from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase


class DeviceManagementPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"

    def url_slug(self):
        return "^device/"


class DeviceManagementAsset(WebpackBundleHook):
    bundle_id = "app"


class DeviceFirstTimeRedirect(RoleBasedRedirectHook):
    role = SUPERUSER
    first_login = True

    @property
    def url(self):
        return (
            self.plugin_url(DeviceManagementPlugin, "device_management") + "#/welcome"
        )


class DeviceManagementNavItem(NavigationHook, WebpackBundleHook):
    bundle_id = "side_nav"
