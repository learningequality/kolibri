from __future__ import absolute_import, print_function, unicode_literals

from kolibri.core.webpack import hooks as webpack_hooks


class LearnSyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded sychronously in learn/learn.html
    """
    class Meta:
        abstract = True

class LearnAsyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded sychronously in learn/learn.html
    """
    class Meta:
        abstract = True
