"""
Learn template tags
===================

Tags for including learn app javascript assets ina template. To use:

.. code-block:: html

    {% load learn_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% learn_assets %}

"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from kolibri.core.webpack.utils import webpack_asset_render

from .. import hooks

register = template.Library()


@register.simple_tag()
def learn_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into management/management.html
    """
    return webpack_asset_render(hooks.LearnSyncHook, async=False)


@register.simple_tag()
def learn_async_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into management/management.html
    """
    return webpack_asset_render(hooks.LearnAsyncHook, async=True)
