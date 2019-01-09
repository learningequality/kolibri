from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import warnings

from django.utils.safestring import mark_safe


def webpack_asset_render(HookClass, is_async=False, **kwargs):
    """
    This is produces content for a  script tag for a WebpackInclusionHook subclass that implement
    different render to html methods either sync or async.
    :param HookClass: a subclass of WebpackInclusionHook
    :param sync: Render sync or async.
    :return: HTML of script tags to insert
    """

    # Backwards compatibility: The reserved keyword 'async' was used before.
    # May be removed in 0.12+.
    async_deprecated = kwargs.pop('async', None)
    if async_deprecated is not None:
        is_async = async_deprecated
        warnings.warn(
            "Using 'async' keyword in webpack_asset_render() is removed in "
            "kolibri 0.12",
            DeprecationWarning
        )

    tags = []
    for hook in HookClass().registered_hooks:
        if not is_async and hasattr(hook, 'render_to_page_load_sync_html'):
            tags.append(
                hook.render_to_page_load_sync_html()
            )
        elif is_async and hasattr(hook, 'render_to_page_load_async_html'):
            tags.append(
                hook.render_to_page_load_async_html()
            )
    return mark_safe('\n'.join(tags))
