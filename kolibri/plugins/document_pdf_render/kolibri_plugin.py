from __future__ import absolute_import, print_function, unicode_literals

from kolibri.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class DocumentPDFRenderPlugin(KolibriPluginBase):
    pass


class DocumentPDFRenderAsset(content_hooks.ContentRendererHook):
    unique_slug = "document_pdf_render_module"
    src_file = "assets/src/module.js"
    content_types_file = "content_types.json"
