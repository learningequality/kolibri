"""
Kolibri Content hooks
---------------------

Hooks for managing the display and rendering of content.
"""

from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
import os

from django.utils.functional import cached_property
from kolibri.core.webpack.hooks import WebpackBundleHook, WebpackInclusionHook
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
    def events(self):
        return {"content_render:{type}".format(type=type): "render" for type in self.content_types}

    @cached_property
    def content_types(self):
        return [
            "{kind}/{extension}".format(kind=kind, extension=extension)
            for kind, extensions in self.content_type_json.items() for extension in extensions
        ]

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


class ContentRendererInclusionHook(WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded wherever content needs to be loaded.
    """

    class Meta:
        abstract = True
