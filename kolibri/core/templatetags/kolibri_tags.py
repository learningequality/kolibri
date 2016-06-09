"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import, print_function, unicode_literals

import json

from django import template
from django.utils.html import mark_safe
from kolibri.core.hooks import NavigationHook

register = template.Library()


@register.simple_tag()
def kolibri_main_navigation():
    """
    A tag to include an initial JS-object to bootstrap data into the app.
    :return: An html string
    """
    nav_items = NavigationHook().get_menu()
    html = ("<script type='text/javascript'>"
            "window._navItems={0};"
            "</script>".format(json.dumps(nav_items)))
    return mark_safe(html)
