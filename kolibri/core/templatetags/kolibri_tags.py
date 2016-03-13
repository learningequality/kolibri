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

import json

from django import template
from django.conf import settings
from django.utils.safestring import mark_safe
from kolibri.plugins import hooks
from kolibri.plugins.hooks import BASE_FRONTEND_ASYNC, BASE_FRONTEND_SYNC
from kolibri.utils.webpack import get_async_events, get_webpack_bundle

register = template.Library()


@register.assignment_tag()
def kolibri_main_navigation():

    for callback in hooks.get_callables(hooks.NAVIGATION_POPULATE):
        for item in callback():
            yield item


def render_as_tags(bundle):
    tags = []
    for chunk in bundle:
        if chunk['name'].endswith('.js'):
            tags.append('<script type="text/javascript" src="{url}"></script>'.format(url=render_as_url(chunk)))
        elif chunk['name'].endswith('.css'):
            tags.append('<link type="text/css" href="{url}" rel="stylesheet"/>'.format(url=render_as_url(chunk)))
    return mark_safe('\n'.join(tags))


def render_as_url(chunk):
    static = getattr(settings, 'STATIC_URL')
    url = chunk.get('publicPath') or chunk['url']
    return "{static}{url}".format(static=static, url=url)


def render_as_async(bundle):
    chunks = get_webpack_bundle(bundle, None)
    async_events = get_async_events(bundle)
    urls = [render_as_url(chunk) for chunk in chunks]
    js = 'Kolibri.register_plugin_async("{bundle}", ["{urls}"], {events}, {once});'.format(
        bundle=bundle,
        urls='","'.join(urls),
        events=json.dumps(async_events.get('events')),
        once=json.dumps(async_events.get('once'))
    )
    return mark_safe('<script>{js}</script>'.format(js=js))


@register.simple_tag()
def frontend_assets(bundle_path, extension=None):
    return render_as_tags(get_webpack_bundle(bundle_path, extension))


def frontend_sync(hook):
    tags = [render_as_tags(get_webpack_bundle(callback(), None)) for callback in hooks.get_callables(hook)]
    return mark_safe('\n'.join(tags))


@register.simple_tag()
def base_frontend_sync():
    return frontend_sync(BASE_FRONTEND_SYNC)


def frontend_async(hook):
    tags = [render_as_async(callback()) for callback in hooks.get_callables(hook)]
    return mark_safe('\n'.join(tags))

@register.simple_tag()
def base_frontend_async():
    return frontend_async(BASE_FRONTEND_ASYNC)
