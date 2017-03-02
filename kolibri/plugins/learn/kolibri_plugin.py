from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks, urls


class LearnPlugin(KolibriPluginBase):
    def url_module(self):
        return urls

    def url_slug(self):
        return "^learn/"


class LearnAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "learn_module"
    src_file = "assets/src/app.js"


class LearnInclusionHook(hooks.LearnSyncHook):
    bundle_class = LearnAsset
