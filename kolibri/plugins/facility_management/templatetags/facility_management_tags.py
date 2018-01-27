"""
Facility Management template tags
=================================

Tags for including management app javascript assets in a template. To use:

.. code-block:: html

    {% load facility_management_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% facility_management_assets %}

"""
from __future__ import absolute_import, print_function, unicode_literals
from django import template
from kolibri.core.webpack.utils import webpack_asset_render
from ..hooks import FacilityManagementSyncHook

register = template.Library()


@register.simple_tag()
def facility_management_assets():
    """
    Using in a template will inject script tags that include the javascript
    assets defined by any concrete hook that subclasses
    FacilityManagementSyncHook.

    :return: HTML of script tags to insert into the template
    """
    return webpack_asset_render(FacilityManagementSyncHook, async=False)
