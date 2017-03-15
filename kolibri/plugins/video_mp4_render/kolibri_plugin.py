from __future__ import absolute_import, print_function, unicode_literals

from kolibri.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class VideoMP4RenderPlugin(KolibriPluginBase):
    pass


class VideoMP4RenderAsset(content_hooks.ContentRendererHook):
    unique_slug = "video_mp4_render_module"
    src_file = "assets/src/module.js"
    content_types_file = "content_types.json"
