from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.utils.translation import ugettext_lazy as _

from .hooks import DeviceManagementSyncHook
from kolibri.core.hooks import UserNavigationHook
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


class DeviceManagementNavItem(UserNavigationHook):
    label = _("Device")
    url = '#'
