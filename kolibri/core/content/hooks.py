"""
Kolibri Content hooks
---------------------

Hooks for managing the display and rendering of content.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json

from django.utils.safestring import mark_safe

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.hooks import KolibriHook


class ContentRendererHook(WebpackBundleHook):
    """
    An inheritable hook that allows special behaviour for a frontend module that defines
    a content renderer.
    """

    #: Set tuple of format presets that this content renderer can handle
    presets = tuple()

    class Meta:
        abstract = True

    def render_to_page_load_async_html(self):
        """
        Generates script tag containing Javascript to register a content renderer.

        :returns: HTML of a script tag to insert into a page.
        """
        # Note, while most plugins use sorted chunks to filter by text direction
        # content renderers do not, as they may need to have styling for a different
        # text direction than the interface due to the text direction of content
        urls = [chunk["url"] for chunk in self.bundle]
        tags = self.frontend_message_tag() + [
            '<script>{kolibri_name}.registerContentRenderer("{bundle}", ["{urls}"], {presets});</script>'.format(
                kolibri_name="kolibriCoreAppGlobal",
                bundle=self.unique_id,
                urls='","'.join(urls),
                presets=json.dumps(self.presets),
            )
        ]
        return mark_safe("\n".join(tags))


class ContentNodeDisplayHook(KolibriHook):
    """
    A hook that registers a capability of a plugin to provide a user interface
    for a content node. When subclassed, this hook should expose a method that
    accepts a ContentNode instance as an argument, and returns a URL where the
    interface to interacting with that node for the user is exposed.
    If this plugin cannot produce an interface for this particular content node
    then it may return None.
    """

    def node_url(self, content_node):
        raise NotImplementedError("This must be overridden by a subclass")
