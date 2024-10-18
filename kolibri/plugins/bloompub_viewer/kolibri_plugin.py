from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class BloomPubRenderPlugin(KolibriPluginBase):
    pass


@register_hook
class BloomPubRenderAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    presets = (format_presets.BLOOMPUB,)
