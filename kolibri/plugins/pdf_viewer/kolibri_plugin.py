from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class DocumentPDFRenderPlugin(KolibriPluginBase):
    pass


@register_hook
class DocumentPDFRenderAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    presets = (format_presets.DOCUMENT,)
