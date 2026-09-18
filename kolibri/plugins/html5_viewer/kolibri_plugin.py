from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class HTML5AppPlugin(KolibriPluginBase):
    pass


@register_hook
class HTML5AppAsset(content_hooks.SandboxedContentViewerHook):
    bundle_id = "main"
    sandbox_handler_id = "sandbox_handler"
    presets = (
        format_presets.HTML5_ZIP,
        format_presets.IMSCP_ZIP,
    )
