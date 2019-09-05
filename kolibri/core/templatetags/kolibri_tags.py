"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack.utils import webpack_asset_render

register = template.Library()


@register.simple_tag()
def kolibri_navigation_actions():
    """
    A tag to include an initial JS-object to bootstrap nav action data into the app.
    :return: An html string
    """
    return webpack_asset_render(NavigationHook)
