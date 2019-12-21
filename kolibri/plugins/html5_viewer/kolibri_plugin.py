from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class HTML5AppPlugin(KolibriPluginBase):
    pass


@register_hook
class HTML5AppAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    presets = (format_presets.HTML5_ZIP,)
