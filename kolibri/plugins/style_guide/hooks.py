from __future__ import absolute_import, print_function, unicode_literals
from kolibri.core.webpack import hooks as webpack_hooks


class StyleGuideSyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded synchronously in style_guide/style_guide.html
    """

    class Meta:
        abstract = True


class StyleGuideAsyncHook(webpack_hooks.WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded asynchronously in style_guide/style_guide.html
    """

    class Meta:
        abstract = True
