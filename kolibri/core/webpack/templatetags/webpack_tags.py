"""
Webpack template tags
=====================

To use

.. code-block:: html

    {% load webpack_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% base_frontend_sync %}

    <!-- Render on-demand async inclusion tag for frontend JS elements -->
    {% base_frontend_async %}

"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from django.utils.safestring import mark_safe

from .. import hooks

register = template.Library()


@register.simple_tag()
def webpack_assets(unique_slug):
    """
    This template tag returns inline Javascript (wrapped in a script tag) that
    registers the events that a KolibriModule listens to, and a list of JS and
    CSS assets that need to be loaded to instantiate the KolibriModule Django
    template. KolibriModules loaded in this way will not be executed,
    initialized or registered until one of the defined events is triggered.

    :param unique_slug: The slug defined for the bundle in its FrontEndSyncHook

    :return: Inline Javascript as HTML for insertion into the DOM.
    """
    hook = hooks.WebpackBundleHook().get_by_slug(unique_slug)
    return hook.render_to_html()


@register.simple_tag()
def base_frontend_assets():
    """
    This is a script tag for the ``FrontEndSyncHook`` hook - this is used in
    ``/base.html`` template to populate any Javascript and CSS that should be
    loaded at page load.
    :return: HTML of script tags to insert into base.html
    """
    tags = []
    for hook in hooks.FrontEndAssetHook().registered_hooks:
        tags.append(
            hook.render_to_html()
        )
    return mark_safe('\n'.join(tags))
