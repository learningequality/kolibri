from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.plugins.hooks import define_hook
from kolibri.core.webpack.hooks import WebpackInclusionSyncMixin


@define_hook
class UserSyncHook(WebpackInclusionSyncMixin):
    """
    Define a hook defining assets to be loaded synchronously in user/user.html
    """
