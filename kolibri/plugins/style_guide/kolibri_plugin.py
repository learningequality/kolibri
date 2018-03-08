from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase

from . import hooks


class StyleGuide(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^style_guide"


class StyleGuideAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "style_guide_module"
    src_file = "assets/src/app.js"


class StyleGuideInclusionHook(hooks.StyleGuideSyncHook):
    bundle_class = StyleGuideAsset
