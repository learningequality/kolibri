"""
Content template tags
=====================

To use

.. code-block:: html

    {% load webpack_tags %}

    <!-- Render on-demand async inclusion tag for content renderers -->
    {% content_renderer_assets %}

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from .. import hooks

register = template.Library()


@register.simple_tag()
def content_renderer_assets():
    """
    This is a script tag for all ``ContentRendererInclusionHook`` hooks that implement a
    render_to_html() method - this is used in in any template to
    register any content renderers with the frontend so that they can be dynamically loaded
    on demand.

    :return: HTML of script tags to insert into template
    """
    return hooks.ContentRendererHook.html()
