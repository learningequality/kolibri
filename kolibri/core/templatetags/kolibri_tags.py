"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from kolibri.core.hooks import NavigationHook

register = template.Library()


@register.simple_tag()
def kolibri_main_navigation():

    for hook in NavigationHook().registered_hooks:
        yield hook
