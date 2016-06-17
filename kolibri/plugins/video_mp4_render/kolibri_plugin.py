from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.learn import hooks


class VideoMP4RenderPlugin(KolibriPluginBase):
    pass


class VideoMP4RenderAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "video_mp4_render_module"
    src_file = "kolibri/plugins/video_mp4_render/assets/src/module.js"
    static_dir = "kolibri/plugins/video_mp4_render/static"
    events = {
        "content_render:video/mp4": "render"
    }


class VideoMP4RenderInclusionHook(hooks.LearnAsyncHook):
    bundle_class = VideoMP4RenderAsset
