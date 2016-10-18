from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from . import hooks, urls


class CoachTools(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^coach/"


class CoachToolsAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "coach_tools_module"
    src_file = "assets/src/app.js"

class CoachToolsInclusionHook(hooks.CoachToolsSyncHook):
    bundle_class = CoachToolsAsset
