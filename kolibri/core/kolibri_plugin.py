from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack.hooks import FrontEndCoreAssetHook
from kolibri.core.webpack.hooks import WebpackBundleHook


class FrontEndCoreAppAssetHook(FrontEndCoreAssetHook):
    unique_slug = "default_frontend"


class FrontEndUserAgentAssetHook(WebpackBundleHook):
    unique_slug = "user_agent"
    inline = True
