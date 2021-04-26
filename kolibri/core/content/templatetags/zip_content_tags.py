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
from six.moves.urllib.parse import quote
from six.moves.urllib.parse import urljoin

from kolibri.core.content.utils.paths import zip_content_static_root

register = template.Library()


@register.simple_tag
def zc_static(path):
    """
    template tag to return static urls in the context of the zipcontent app
    """
    return urljoin(zip_content_static_root(), quote(path))
