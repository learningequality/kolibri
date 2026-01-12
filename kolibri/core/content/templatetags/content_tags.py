"""
Content template tags
=====================

To use

.. code-block:: html

    {% load webpack_tags %}

    <!-- Render on-demand async inclusion tag for content viewers -->
    {% content_viewer_assets %}

"""

from django import template

from .. import hooks

register = template.Library()


@register.simple_tag()
def content_viewer_assets():
    """
    Generates script tags for all ``ContentViewerHook`` hooks.
    Used in templates to register content viewers with the frontend
    so they can be dynamically loaded on demand.

    :return: HTML of script tags to insert into template
    """
    return hooks.ContentViewerHook.html()
