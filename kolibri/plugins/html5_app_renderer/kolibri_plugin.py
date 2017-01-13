from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.learn import hooks


class HTML5AppPlugin(KolibriPluginBase):
    pass


class HTML5AppAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "html5_app_renderer_module"
    src_file = "assets/src/module.js"
    events = {
        "content_render:html5/zip": "render"
    }


class HTML5AppInclusionHook(hooks.LearnAsyncHook):
    bundle_class = HTML5AppAsset
