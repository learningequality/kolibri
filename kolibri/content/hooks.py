"""
Kolibri Content hooks
---------------------

Hooks for managing the display and rendering of content.
"""

from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
import os

from django.conf import settings as django_settings
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from kolibri.core.webpack.hooks import WebpackBundleHook
from le_utils.constants import content_kinds

logger = logging.getLogger(__name__)

class ContentRendererHook(WebpackBundleHook):
    """
    An inheritable hook that allows special behaviour for a frontend module that defines
    a content renderer.

    Reads a JSON file of this format:
    {
        "kind": [
            "file_extension"
        ]
    }
    e.g.
    {
        "video": [
            "mp4",
            "ogg",
            "wmv"
        ]
    }
    Detailing the kinds and file extensions that the renderer can handle.
    """

    # Set local path to content type JSON that details the kind, extension pairs this deals with.
    content_types_file = ""

    class Meta:
        abstract = True

    @cached_property
    def content_type_json(self):
        try:
            file_path = os.path.join(self._module_file_path, self.content_types_file)
            with open(file_path) as f:
                content_types = json.load(f)
                for kind in content_types.keys():
                    if kind not in dict(content_kinds.choices):
                        logger.debug("{kind} not found in valid content kinds for plugin {name}".format(
                            kind=kind, name=self.unique_slug))
                return content_types
        except IOError:
            raise IOError("Content types file not found at {}".format(self.content_types_file))

    def render_to_page_load_async_html(self):
        """
        Generates script tag containing Javascript to register a content renderer.

        :returns: HTML of a script tag to insert into a page.
        """
        urls = [chunk['url'] for chunk in self.bundle]
        js = '{kolibri_name}.registerContentRenderer("{bundle}", ["{urls}"], {content_types});'.format(
            kolibri_name=django_settings.KOLIBRI_CORE_JS_NAME,
            bundle=self.unique_slug,
            urls='","'.join(urls),
            content_types=json.dumps(self.content_type_json),
        )
        js += self.frontend_message_file_script_tag()
        return mark_safe('<script>{js}</script>'.format(js=js))
