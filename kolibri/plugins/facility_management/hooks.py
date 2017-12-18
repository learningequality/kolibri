from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack.hooks import WebpackInclusionHook


class FacilityManagementSyncHook(WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded sychronously in the template
    """
    class Meta:
        abstract = True
