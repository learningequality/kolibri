# -*- coding: utf-8 -*-
"""
Kolibri example plugin
======================

Copy and modify this code for your own plugin.

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.plugins.base import KolibriPluginBase


class ExamplePlugin(KolibriPluginBase):

    @classmethod
    def enable(cls, config):
        print("Activating example plugin")
        # Make this automatic and use __name__ ?
        config["INSTALLED_APPS"].append("kolibri.plugins.example_plugin")

    @classmethod
    def disable(cls, config):
        print("Deactivating example plugin")
        # Make this automatic and use __name__ ?
        config["INSTALLED_APPS"].remove("kolibri.plugins.example_plugin")
