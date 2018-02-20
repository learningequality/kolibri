from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks


class Coach(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^coach/"


class CoachAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "coach_module"
    src_file = "assets/src/app.js"

class CoachInclusionHook(hooks.CoachSyncHook):
    bundle_class = CoachAsset
