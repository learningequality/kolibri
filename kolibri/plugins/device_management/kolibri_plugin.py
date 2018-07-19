from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .hooks import DeviceManagementSyncHook
from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.base import KolibriPluginBase


class DeviceManagementPlugin(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^device/"


class DeviceManagementAsset(WebpackBundleHook):
    unique_slug = "device_management_module"
    src_file = "assets/src/app.js"


class DeviceManagementInclusionHook(DeviceManagementSyncHook):
    bundle_class = DeviceManagementAsset


class DeviceFirstTimeRedirect(RoleBasedRedirectHook):
    role = SUPERUSER
    first_login = True

    @property
    def url(self):
        return self.plugin_url(DeviceManagementPlugin, 'device_management') + '#/welcome'


class DeviceManagementNavItem(NavigationHook, WebpackBundleHook):
    unique_slug = "device_management_side_nav"
    src_file = "assets/src/views/DeviceManagementSideNavEntry.vue"
