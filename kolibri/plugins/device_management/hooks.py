from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack.hooks import WebpackInclusionHook


class DeviceManagementSyncHook(WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded sychronously in the template
    """
    class Meta:
        abstract = True
