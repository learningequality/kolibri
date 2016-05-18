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

from .. import hooks
from ..utils import webpack_asset_render

register = template.Library()


@register.simple_tag()
def webpack_asset(unique_slug):
    """
    Return statically loaded ('sync' loaded) assets for a specific asset.

    You need to define the asset by means of inheriting from WebpackBundleHook.

    :param unique_slug: The slug defined for the bundle in its FrontEndSyncHook

    :return: Inline Javascript as HTML for insertion into the DOM.
    """
    hook = hooks.WebpackBundleHook().get_by_slug(unique_slug)
    return hook.render_to_page_load_sync_html()


@register.simple_tag()
def webpack_async_asset(unique_slug):
    """
    This template tag returns inline Javascript (wrapped in a script tag) that
    registers the events that a KolibriModule listens to, and a list of JS and
    CSS assets that need to be loaded to instantiate the KolibriModule Django
    template. KolibriModules loaded in this way will not be executed,
    initialized or registered until one of the defined events is triggered.

    You need to define the asset by means of inheriting from WebpackBundleHook.

    :param unique_slug: The slug defined for the bundle in its FrontEndSyncHook

    :return: Inline Javascript as HTML for insertion into the DOM.
    """
    hook = hooks.WebpackBundleHook().get_by_slug(unique_slug)
    return hook.render_to_page_load_async_html()


@register.simple_tag()
def webpack_base_assets():
    """
    This is a script tag for all ``FrontEndAssetHook`` hooks that implement a
    render_to_html() method - this is used in ``/base.html`` template to
    populate any Javascript and CSS that should be loaded at page load.

    :return: HTML of script tags to insert into base.html
    """
    return webpack_asset_render(hooks.FrontEndBaseSyncHook, async=False)


@register.simple_tag()
def webpack_base_async_assets():
    """
    This is a script tag for all ``FrontEndAssetHook`` hooks that implement a
    render_to_html() method - this is used in ``/base.html`` template to
    populate any Javascript and CSS that should be loaded at page load.

    :return: HTML of script tags to insert into base.html
    """
    return webpack_asset_render(hooks.FrontEndBaseASyncHook, async=True)
