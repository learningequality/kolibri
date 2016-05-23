"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import, print_function, unicode_literals

import json

from django import template
from django.utils.html import mark_safe
from kolibri.core.hooks import NavigationHook, UserNavigationHook

register = template.Library()


@register.simple_tag()
def kolibri_main_navigation():
    """
    A tag to include an initial JS-object to bootstrap data into the app.
    :return: An html string
    """
    init_data = {
        'nav_items': [],
        'user_nav_items': [],
    }

    for hook in NavigationHook().registered_hooks:
        init_data['nav_items'].append({
            'text': str(hook.label),
            'url': str(hook.url),
        })

    for hook in UserNavigationHook().registered_hooks:
        init_data['user_nav_items'].append({
            'text': str(hook.label),
            'url': str(hook.url),
        })

    html = ("<script type='text/javascript'>"
            "window._nav={0};"
            "</script>".format(json.dumps(init_data)))
    return mark_safe(html)
