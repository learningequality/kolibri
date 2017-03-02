from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack.hooks import FrontEndCoreAssetHook, FrontEndCoreHook
from kolibri.plugins.base import KolibriPluginBase


class KolibriCore(KolibriPluginBase):
    """
    The most minimal plugin possible. Because it's in the core, it doesn't define ``enable`` or ``disable``. Those
    methods should never be called for this plugin.
    """
    pass


class FrontEndCoreAppAssetHook(FrontEndCoreAssetHook):
    unique_slug = "default_frontend"
    src_file = "assets/src/core-app"


class FrontEndCoreInclusionHook(FrontEndCoreHook):
    bundle_class = FrontEndCoreAppAssetHook
