from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks


class EdulutionSyncHook(webpack_hooks.WebpackInclusionHook):
    class Meta:
        abstract = True


class EdulutionAsyncHook(webpack_hooks.WebpackInclusionHook):
    class Meta:
        abstract = True
