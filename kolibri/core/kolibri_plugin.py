"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse_lazy
from django.utils.translation import ugettext_lazy as _
from kolibri.core.webpack.hooks import FrontEndCoreAssetHook, FrontEndCoreHook
from kolibri.plugins.base import KolibriPluginBase

from . import hooks


class KolibriCore(KolibriPluginBase):
    """
    The most minimal plugin possible. Because it's in the core, it doesn't define ``enable`` or ``disable``. Those
    methods should never be called for this plugin.
    """
    pass


class MainNavigationItem(hooks.NavigationHook):
    label = _("Start page")
    url = reverse_lazy('kolibri:index')


class FrontEndCoreAssetHook(FrontEndCoreAssetHook):
    unique_slug = "default_frontend"
    src_file = "kolibri/core/assets/src/core_app.js"
    static_dir = "kolibri/core/static"


class FrontEndCoreInclusionHook(FrontEndCoreHook):

    bundle_class = FrontEndCoreAssetHook
