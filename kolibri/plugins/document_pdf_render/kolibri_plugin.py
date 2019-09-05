from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class DocumentPDFRenderPlugin(KolibriPluginBase):
    pass


class DocumentPDFRenderAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    presets = (format_presets.DOCUMENT,)
