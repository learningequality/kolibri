from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class StyleGuide(KolibriPluginBase):
    root_view_urls = "root_urls"


class StyleGuideAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"
