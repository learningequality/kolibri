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
from django import template

from .. import hooks

register = template.Library()


@register.simple_tag()
def webpack_asset(unique_id):
    """
    Return statically loaded ('sync' loaded) assets for a specific asset.

    You need to define the asset by means of inheriting from WebpackBundleHook.

    :param unique_id:   The unique_id defined as the module_path of the plugin
                        concatenated with the bundle_id of the WebpackBundleHook

    :return: Inline Javascript as HTML for insertion into the DOM.
    """
    hook = hooks.WebpackBundleHook.get_by_unique_id(unique_id)
    return hook.render_to_page_load_sync_html()
