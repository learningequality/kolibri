"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse_lazy
from django.utils.translation import ugettext_lazy as _
from kolibri.plugins.base import KolibriPluginBase

from . import hooks
from .webpack.hooks import FrontEndSyncHook


class KolibriCore(KolibriPluginBase):
    """
    The most minimal plugin possible. Because it's in the core, it doesn't define ``enable`` or ``disable``. Those
    methods should never be called for this plugin.
    """
    pass


class MainNavigationItem(hooks.NavigationHook):
    label = _("Start page")
    url = reverse_lazy('kolibri:index')


class DefaultFrontEndAsset(FrontEndSyncHook):
    unique_slug = "default_frontend"
    entry_file = "assets/src/kolibri_core_app.js"
    external = True
    core = True
