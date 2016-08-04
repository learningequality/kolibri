from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack.hooks import FrontEndCoreAssetHook, FrontEndCoreHook
from kolibri.plugins.base import KolibriPluginBase


class KolibriCore(KolibriPluginBase):
    """
    The most minimal plugin possible. Because it's in the core, it doesn't define ``enable`` or ``disable``. Those
    methods should never be called for this plugin.
    """
    pass


class FrontEndCoreAssetHook(FrontEndCoreAssetHook):
    unique_slug = "default_frontend"
    src_file = "kolibri/core/assets/src/core-app"
    static_dir = "kolibri/core/static"


class FrontEndCoreInclusionHook(FrontEndCoreHook):
    bundle_class = FrontEndCoreAssetHook
