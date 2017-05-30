from __future__ import absolute_import, print_function, unicode_literals

from django.utils.translation import ugettext_lazy as _
from kolibri.core.hooks import UserNavigationHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.base import KolibriPluginBase

from .hooks import FacilityManagementSyncHook


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


class FacilityManagementNavItem(UserNavigationHook):
    label = _("Facility")
    url = '#'
