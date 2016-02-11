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
from webpack_loader.templatetags.webpack_loader import render_as_tags

from kolibri.plugins import hooks

from kolibri.utils.webpack import get_webpack_bundle

register = template.Library()


@register.assignment_tag()
def kolibri_main_navigation():

    for callback in hooks.get_callables(hooks.NAVIGATION_POPULATE):
        for item in callback():
            yield item

@register.simple_tag()
def frontend_assets(bundle_name, extension=None, plugin='kolibri.core'):
    return render_as_tags(get_webpack_bundle(bundle_name, extension, plugin))
