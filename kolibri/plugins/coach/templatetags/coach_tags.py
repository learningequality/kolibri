# coding=utf-8
"""
coach template tags
========================
Tags for including plugin javascript assets into a template.
"""

from __future__ import absolute_import, print_function, unicode_literals
from django import template
from kolibri.core.webpack.utils import webpack_asset_render
from .. import hooks

register = template.Library()


@register.simple_tag()
def coach_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses CoachSyncHook.
    :return: HTML of script tags to insert into coach/coach.html
    """
    return webpack_asset_render(hooks.CoachSyncHook, async=False)


@register.simple_tag()
def coach_async_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses CoachSyncHook.
    :return: HTML of script tags to insert into coach/coach.html
    """
    return webpack_asset_render(hooks.CoachAsyncHook, async=True)
