from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.learn import hooks


class AudioMP3RenderPlugin(KolibriPluginBase):
    pass


class AudioMP3RenderAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "audio_mp3_render_module"
    src_file = "kolibri/plugins/audio_mp3_render/assets/src/module.js"
    static_dir = "kolibri/plugins/audio_mp3_render/static"
    events = {
        "content_render:audio/mp3": "render"
    }


class AudioMP3RenderInclusionHook(hooks.LearnAsyncHook):
    bundle_class = AudioMP3RenderAsset
