from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.content import hooks as content_hooks
from kolibri.plugins.base import KolibriPluginBase


class HTML5AppPlugin(KolibriPluginBase):
    pass


class HTML5AppAsset(content_hooks.ContentRendererHook):
    bundle_id = "main"
    content_types_file = "content_types.json"
