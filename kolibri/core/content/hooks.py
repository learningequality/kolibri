"""
Kolibri Content hooks
---------------------

Hooks for managing the display and rendering of content.
"""

import json
from abc import abstractmethod

from django.core.serializers.json import DjangoJSONEncoder
from django.utils.safestring import mark_safe
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.core.webpack.hooks import WebpackInclusionMixin
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class ContentRendererHook(WebpackBundleHook, WebpackInclusionMixin):
    """
    An inheritable hook that allows special behaviour for a frontend module that defines
    a content renderer.
    """

    #: Set tuple of format presets that this content renderer can handle
    @property
    @abstractmethod
    def presets(self):
        pass

    #: Optional tuple of CSS selectors that this content renderer can handle
    css_selectors = ()

    #: Whether to allow object tag handling (defaults to False for sandboxing compatibility)
    allow_object_tag = False

    @classmethod
    def all_css_selectors(cls):
        """Get all CSS selectors (auto-generated from presets + custom), cached."""
        if not hasattr(cls, "_cached_css_selectors"):
            selectors = list(cls.css_selectors)

            if cls.allow_object_tag:
                for preset in cls.presets:
                    preset_obj = next(
                        x for x in format_presets.PRESETLIST if x.id == preset
                    )
                    for fmt in preset_obj.allowed_formats:
                        fmt_obj = file_formats.getformat(fmt)
                        selectors.append(f'object[type="{fmt_obj.mimetype}"]')

            cls._cached_css_selectors = tuple(sorted(set(selectors)))
        return cls._cached_css_selectors

    @classmethod
    def html(cls):
        tags = []
        for hook in cls.registered_hooks:
            tags.append(hook.template_html())
        return mark_safe("\n".join(tags))

    def template_html(self):
        """
        Generates template tags containing data to register a content renderer.

        :returns: HTML of a template tags to insert into a page.
        """
        # Note, while most plugins use sorted chunks to filter by text direction
        # content renderers do not, as they may need to have styling for a different
        # text direction than the interface due to the text direction of content
        urls = [chunk["url"] for chunk in self.bundle]
        tags = (
            self.frontend_message_tag()
            + self.plugin_data_tag()
            + [
                '<template data-viewer="{bundle}">{data}</template>'.format(
                    bundle=self.unique_id,
                    data=json.dumps(
                        {
                            "urls": urls,
                            "presets": self.presets,
                            "css_selectors": self.all_css_selectors(),
                        },
                        separators=(",", ":"),
                        ensure_ascii=False,
                        cls=DjangoJSONEncoder,
                    ),
                )
            ]
        )
        return mark_safe("\n".join(tags))


@define_hook
class ContentNodeDisplayHook(KolibriHook):
    """
    A hook that registers a capability of a plugin to provide a user interface
    for a content node. When subclassed, this hook should expose a method that
    accepts a ContentNode instance as an argument, and returns a URL where the
    interface to interacting with that node for the user is exposed.
    If this plugin cannot produce an interface for this particular content node
    then it may return None.
    """

    @abstractmethod
    def node_url(self, content_node):
        pass


@define_hook
class ShareFileHook(KolibriHook):
    @abstractmethod
    def share_file(self, filename, message):
        pass

    @classmethod
    def execute_file_share(cls, filename, message):
        for hook in cls.registered_hooks:
            hook.share_file(filename, message)
