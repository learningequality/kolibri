"""
Device Management template tags
===============================

Tags for including management app javascript assets in a template. To use:

.. code-block:: html

    {% load device_management_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% device_management_assets %}

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from ..hooks import DeviceManagementSyncHook
from kolibri.core.webpack.utils import webpack_asset_render

register = template.Library()


@register.simple_tag()
def device_management_assets():
    """
    Using in a template will inject script tags that include the javascript
    assets defined by any concrete hook that subclasses
    DeviceManagementSyncHook.

    :return: HTML of script tags to insert into device_management.html
    """
    return webpack_asset_render(DeviceManagementSyncHook, is_async=False)
