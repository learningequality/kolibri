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
from django.conf import settings
from django.utils.safestring import mark_safe
from kolibri.plugins import hooks
from kolibri.utils.webpack import get_webpack_bundle

register = template.Library()


@register.assignment_tag()
def kolibri_main_navigation():

    for callback in hooks.get_callables(hooks.NAVIGATION_POPULATE):
        for item in callback():
            yield item


def render_as_tags(bundle):
    tags = []
    static = getattr(settings, 'STATIC_URL')
    for chunk in bundle:
        url = chunk.get('publicPath') or chunk['url']
        if chunk['name'].endswith('.js'):
            tags.append('<script type="text/javascript" src="{static}/{url}"></script>'.format(static=static, url=url))
        elif chunk['name'].endswith('.css'):
            tags.append('<link type="text/css" href="{static}/{url}" rel="stylesheet"/>'.format(static=static, url=url))
    return mark_safe('\n'.join(tags))

@register.simple_tag()
def frontend_assets(bundle_path, extension=None):
    return render_as_tags(get_webpack_bundle(bundle_path, extension))
