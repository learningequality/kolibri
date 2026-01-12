from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class H5PViewerPlugin(KolibriPluginBase):
    pass


@register_hook
class H5PViewerAsset(content_hooks.SandboxedContentViewerHook):
    bundle_id = "main"
    sandbox_handler_id = "sandbox_handler"
    presets = (format_presets.H5P_ZIP,)
