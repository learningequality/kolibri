# -*- coding: utf-8 -*-
"""TODO: Write something about this module (everything in the docstring
enters the docs)

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import importlib

from django.conf import settings

from kolibri.logger import logger

from . import hooks
from .base import KolibriPluginBase

registry = {}

__initialized = False

def initialize():
    global __initialized

    if not __initialized:
        logger.debug("Loading kolibri plugin registry...")

        for app in settings.INSTALLED_APPS:
            try:
                plugin_module = importlib.import_module(app + ".kolibri_plugin")
                logger.debug("Loaded kolibri plugin: {}".format(app))
                plugin_classes = []
                for obj in plugin_module.__dict__.values():
                    if type(obj) == type and obj is not KolibriPluginBase and issubclass(obj, KolibriPluginBase):
                        plugin_classes.append(obj)
                for plugin_klass in plugin_classes:
                    plugin_obj = plugin_klass()
                    for hook, callback in plugin_obj.hooks().items():
                        hooks.register_hook(hook, callback)
            except ImportError:
                pass

        __initialized = True
