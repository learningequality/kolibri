from __future__ import absolute_import, print_function, unicode_literals

from kolibri.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class AudioMP3RenderPlugin(KolibriPluginBase):
    pass


class AudioMP3RenderAsset(content_hooks.WebpackBundleHook):
    unique_slug = "audio_mp3_render_module"
    src_file = "assets/src/module.js"
    content_types_file = "assets/src/content_types.json"


class AudioMP3RenderInclusionHook(content_hooks.ContentRendererInclusionHook):
    bundle_class = AudioMP3RenderAsset
