from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack.hooks import FrontEndCoreAssetHook
from kolibri.core.webpack.hooks import FrontEndCoreHook
from kolibri.core.webpack.hooks import WebpackBundleHook


class FrontEndCoreAppAssetHook(FrontEndCoreAssetHook):
    unique_slug = "default_frontend"
    src_file = "assets/src/core-app"


class FrontEndUserAgentAssetHook(WebpackBundleHook):
    unique_slug = "user_agent"
    src_file = "assets/src/userAgentCheck.js"
    inline = True


class FrontEndCoreInclusionHook(FrontEndCoreHook):
    bundle_class = FrontEndCoreAppAssetHook
