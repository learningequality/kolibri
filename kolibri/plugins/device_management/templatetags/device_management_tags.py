"""
Device Management template tags
===============================

Tags for including management app javascript assets in a template. To use:

.. code-block:: html

    {% load device_management_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% device_management_assets %}

"""
from __future__ import absolute_import, print_function, unicode_literals
from django import template
from kolibri.core.webpack.utils import webpack_asset_render
from ..hooks import DeviceManagementSyncHook

register = template.Library()


@register.simple_tag()
def device_management_assets():
    """
    Using in a template will inject script tags that include the javascript
    assets defined by any concrete hook that subclasses
    DeviceManagementSyncHook.

    :return: HTML of script tags to insert into device_management.html
    """
    return webpack_asset_render(DeviceManagementSyncHook, async=False)
