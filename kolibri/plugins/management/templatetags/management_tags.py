"""
Management template tags
========================

Tags for including management app javascript assets ina template. To use:

.. code-block:: html

    {% load management_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% management_assets %}

"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from kolibri.core.webpack.utils import webpack_asset_render

from .. import hooks

register = template.Library()


@register.simple_tag()
def management_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into management/management.html
    """
    return webpack_asset_render(hooks.ManagementSyncHook, async=False)
