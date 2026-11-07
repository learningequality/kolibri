from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class ZimViewerPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"


@register_hook
class ZimViewerAsset(content_hooks.SandboxedContentViewerHook):
    bundle_id = "main"
    presets = (format_presets.ZIM,)


@register_hook
class ZimVirtualNodeEnumerator(content_hooks.ContentNodeEnumeratorHook):
    def virtual_roots(self, channel_id):
        from kolibri.plugins.zim_viewer.virtual_nodes import zim_roots  # noqa: PLC0415

        return zim_roots(channel_id)

    def enumerate_virtual_nodes(self, root_id, local_file_id):
        from kolibri.plugins.zim_viewer.virtual_nodes import (  # noqa: PLC0415
            enumerate_zim_subnodes,
        )

        return enumerate_zim_subnodes(local_file_id)
