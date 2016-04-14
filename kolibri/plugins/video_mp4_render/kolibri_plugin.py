# -*- coding: utf-8 -*-
"""
Copy and modify this code for your own plugin.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import CONTENT_RENDERER_ASYNC, FRONTEND_PLUGINS

logger = logging.getLogger(__name__)


class KolibriVideoMP4RenderFrontEnd(KolibriFrontEndPluginBase):
    """
    The base learn code for the learn page.
    """
    entry_file = "assets/src/render_video_mp4_module.js"

    events = {
        "content_render:video/mp4": "render"
    }

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
            CONTENT_RENDERER_ASYNC: self.plugin_name,
        }


PLUGINS = [
    KolibriVideoMP4RenderFrontEnd,
]
