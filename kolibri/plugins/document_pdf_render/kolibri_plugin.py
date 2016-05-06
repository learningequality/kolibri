# -*- coding: utf-8 -*-
"""
Copy and modify this code for your own plugin.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import CONTENT_RENDERER_ASYNC

logger = logging.getLogger(__name__)


class KolibriDocumentPDFRenderFrontEnd(KolibriFrontEndPluginBase):
    """
    The base learn code for the learn page.
    """
    entry_file = "assets/src/render_document_pdf_module.js"

    events = {
        "content_render:document/pdf": "render"
    }

    def hooks(self):
        return {
            CONTENT_RENDERER_ASYNC: self.plugin_name,
        }


PLUGINS = [
    KolibriDocumentPDFRenderFrontEnd,
]
