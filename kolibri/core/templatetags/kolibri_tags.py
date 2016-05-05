"""
Kolibri template tags
=====================

To use

.. code-block:: html

    {% load kolibri_tags %}

    <ul>
    {% for navigation in kolibri_main_navigation %}
        <li><a href="{{ navigation.menu_url }}">{{ navigation.menu_name }}</a></li>
    {% endfor %}
    </ul>

"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from kolibri.core.hooks import NavigationHook

register = template.Library()


@register.simple_tag()
def kolibri_main_navigation():

    for hook in NavigationHook().registered_hooks:
        yield hook
