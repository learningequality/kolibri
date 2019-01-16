# coding=utf-8
"""
user template tags
========================
Tags for including plugin javascript assets into a template.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from .. import hooks
from kolibri.core.webpack.utils import webpack_asset_render

register = template.Library()


@register.simple_tag()
def user_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses UserSyncHook.
    :return: HTML of script tags to insert into user/user.html
    """
    return webpack_asset_render(hooks.UserSyncHook, is_async=False)


@register.simple_tag()
def user_async_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses UserSyncHook.
    :return: HTML of script tags to insert into user/user.html
    """
    return webpack_asset_render(hooks.UserAsyncHook, is_async=True)
