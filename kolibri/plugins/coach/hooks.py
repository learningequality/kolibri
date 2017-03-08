from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack import hooks as webpack_hooks


class CoachToolsSyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded synchronously in coach/coach.html
    """

    class Meta:
        abstract = True


class CoachToolsAsyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded asynchronously in coach/coach.html
    """

    class Meta:
        abstract = True
