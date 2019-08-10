from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack.hooks import FrontEndCoreAssetHook
from kolibri.core.webpack.hooks import WebpackBundleHook


class FrontEndCoreAppAssetHook(FrontEndCoreAssetHook):
    bundle_id = "default_frontend"


class FrontEndUserAgentAssetHook(WebpackBundleHook):
    bundle_id = "user_agent"
    inline = True
