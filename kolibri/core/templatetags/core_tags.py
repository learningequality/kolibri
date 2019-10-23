"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from kolibri.core.hooks import FrontEndBaseSyncHook
from kolibri.core.hooks import FrontEndBaseASyncHook

register = template.Library()


@register.simple_tag()
def frontend_base_assets():
    """
    This is a script tag for all ``FrontEndAssetHook`` hooks that implement a
    render_to_html() method - this is used in ``/base.html`` template to
    populate any Javascript and CSS that should be loaded at page load.

    :return: HTML of script tags to insert into base.html
    """
    return FrontEndBaseSyncHook.html()


@register.simple_tag()
def frontend_base_async_assets():
    """
    This is a script tag for all ``FrontEndAssetHook`` hooks that implement a
    render_to_html() method - this is used in ``/base.html`` template to
    populate any Javascript and CSS that should be loaded at page load.

    :return: HTML of script tags to insert into base.html
    """
    return FrontEndBaseASyncHook.html()
