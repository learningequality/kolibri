from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class SlideshowRenderPlugin(KolibriPluginBase):
    pass


class SlideshowRenderAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    preset = (format_presets.SLIDESHOW_MANIFEST,)
