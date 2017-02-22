from __future__ import absolute_import, print_function, unicode_literals

from django.utils.translation import ugettext_lazy as _
from kolibri.core.hooks import UserNavigationHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks, urls


class ManagementPlugin(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^management/"


class ManagementAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "management_module"
    src_file = "assets/src/app.js"


class ManagementInclusionHook(hooks.ManagementSyncHook):
    bundle_class = ManagementAsset


class ManagementNavItem(UserNavigationHook):
    label = _("Management")
    url = '#'
