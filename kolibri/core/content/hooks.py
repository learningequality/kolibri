"""
Kolibri Content hooks
---------------------

Hooks for managing the display and rendering of content.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import io
import json
import logging
import os

from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from le_utils.constants import content_kinds

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.utils import conf

logger = logging.getLogger(__name__)

_JSON_CONTENT_TYPES_CACHE = {}


class ContentRendererHook(WebpackBundleHook):
    """
    An inheritable hook that allows special behaviour for a frontend module that defines
    a content renderer. Reads a JSON file detailing the kinds and file extensions that the
    renderer can handle.
    """

    """
    JSON file format:
    {
        "kinds": [
            {
                "name": "kind_name",
                "extensions": [
                    "file_extension"
                ]
            }
        ]
    }
    e.g.
    {
        "kinds": [
            {
                "name": "video",
                "extensions": [
                    "mp4",
                    "ogg",
                    "wmv"
                ]
            }
        ]
    }
    """

    # Set local path to content type JSON that details the kind, extension pairs this deals with.
    content_types_file = ""

    class Meta:
        abstract = True

    @cached_property
    def content_types(self):
        global _JSON_CONTENT_TYPES_CACHE
        if not _JSON_CONTENT_TYPES_CACHE.get(self.unique_slug):
            try:
                file_path = os.path.join(self._module_file_path, self.content_types_file)
                with io.open(file_path, mode='r', encoding='utf-8') as f:
                    content_types = json.load(f)
                    for kind_data in content_types.get('kinds', []):
                        if kind_data.get("name") not in dict(content_kinds.choices):
                            logger.debug("{kind} not found in valid content kinds for plugin {name}".format(
                                kind=kind_data.get("name"), name=self.unique_slug))
                    _JSON_CONTENT_TYPES_CACHE[self.unique_slug] = content_types
            except IOError:
                raise IOError("Content types file not found at {}".format(self.content_types_file))
        return _JSON_CONTENT_TYPES_CACHE.get(self.unique_slug, {})

    def render_to_page_load_async_html(self):
        """
        Generates script tag containing Javascript to register a content renderer.

        :returns: HTML of a script tag to insert into a page.
        """
        # Note, while most plugins use sorted chunks to filter by text direction
        # content renderers do not, as they may need to have styling for a different
        # text direction than the interface due to the text direction of content
        urls = [chunk['url'] for chunk in self.bundle]
        tags = self.frontend_message_tag() +\
            ['<script>{kolibri_name}.registerContentRenderer("{bundle}", ["{urls}"], {content_types});</script>'.format(
                kolibri_name=conf.KOLIBRI_CORE_JS_NAME,
                bundle=self.unique_slug,
                urls='","'.join(urls),
                content_types=json.dumps(self.content_types),
            )]
        return mark_safe('\n'.join(tags))
