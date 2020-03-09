from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from le_utils.constants import format_presets

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.conf import OPTIONS


class HTML5AppPlugin(KolibriPluginBase):
    kolibri_options = "options"


@register_hook
class HTML5AppAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    presets = (format_presets.HTML5_ZIP,)

    @property
    def plugin_data(self):
        return {"html5_sandbox_tokens": OPTIONS["HTML5"]["SANDBOX"]}
