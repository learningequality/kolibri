# -*- coding: utf-8 -*-
"""
Copy and modify this code for your own plugin.
"""
from __future__ import absolute_import, print_function, unicode_literals

import logging

from kolibri.plugins.base import KolibriFrontEndPluginBase
from kolibri.plugins.hooks import BASE_FRONTEND_ASYNC, FRONTEND_PLUGINS

logger = logging.getLogger(__name__)


class KolibriExampleFrontEnd(KolibriFrontEndPluginBase):
    """
    Plugin to define a frontend plugin that can be loaded independently from other code.
    """
    entry_file = "assets/example/example_module.js"
    events = {
        'something_happened': 'hello_world'
    }
    once = {
        'nothing_happened': 'hello_world'
    }

    def hooks(self):
        return {
            FRONTEND_PLUGINS: self._register_front_end_plugins,
            BASE_FRONTEND_ASYNC: self.plugin_name,
        }


PLUGINS = [
    KolibriExampleFrontEnd,
]
