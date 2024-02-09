# coding=utf-8
"""
user template tags
========================
Tags for including plugin javascript assets into a template.
"""
from django import template

from .. import hooks

register = template.Library()


@register.simple_tag()
def user_auth_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses UserAuthSyncHook.
    :return: HTML of script tags to insert into user_auth/user_auth.html
    """
    return hooks.UserAuthSyncHook.html()
