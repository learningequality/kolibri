from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .hooks import FacilityManagementSyncHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.base import KolibriPluginBase


class FacilityManagementPlugin(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^facility/"


class FacilityManagementAsset(WebpackBundleHook):
    unique_slug = "facility_management_module"
    src_file = "assets/src/app.js"


class FacilityManagementInclusionHook(FacilityManagementSyncHook):
    bundle_class = FacilityManagementAsset
