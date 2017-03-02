from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.learn import hooks


class DocumentPDFRenderPlugin(KolibriPluginBase):
    pass


class DocumentPDFRenderAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "document_pdf_render_module"
    src_file = "assets/src/module.js"
    events = {
        "content_render:document/pdf": "render"
    }


class DocumentPDFRenderInclusionHook(hooks.LearnAsyncHook):
    bundle_class = DocumentPDFRenderAsset
