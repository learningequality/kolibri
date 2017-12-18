from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack import hooks as webpack_hooks


class DeviceManagementSyncHook(webpack_hooks.WebpackInclusionHook):
    class Meta:
        abstract = True
