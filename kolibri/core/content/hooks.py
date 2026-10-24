"""
Kolibri Content hooks
---------------------

Hooks for managing the display and viewing of content.
"""

import json
from abc import abstractmethod

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.safestring import mark_safe
from importlib_resources import files
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from kolibri.core.content.utils.paths import zip_content_static_js_url
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.core.webpack.hooks import WebpackInclusionMixin
from kolibri.plugins.hooks import define_hook
from kolibri.plugins.hooks import KolibriHook


@define_hook
class ContentViewerHook(WebpackBundleHook, WebpackInclusionMixin):
    """
    An inheritable hook that allows special behaviour for a frontend module that defines
    a content viewer.
    """

    #: Set tuple of format presets that this content viewer can handle
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

    @property
    def viewer_data(self):
        """
        Data registering this content viewer with the frontend.

        :returns: dict serialized into this viewer's template tag.
        """
        # Note, while most plugins use sorted chunks to filter by text direction
        # content viewers do not, as they may need to have styling for a different
        # text direction than the interface due to the text direction of content
        return {
            "urls": [chunk["url"] for chunk in self.bundle],
            "presets": self.presets,
            "css_selectors": self.all_css_selectors(),
        }

    def template_html(self):
        """
        Generates template tags containing data to register a content viewer.

        :returns: HTML of a template tags to insert into a page.
        """
        tags = (
            self.frontend_message_tag()
            + self.plugin_data_tag()
            + [
                '<template data-viewer="{bundle}">{data}</template>'.format(
                    bundle=self.unique_id,
                    data=json.dumps(
                        self.viewer_data,
                        separators=(",", ":"),
                        ensure_ascii=False,
                        cls=DjangoJSONEncoder,
                    ),
                )
            ]
        )
        return mark_safe("\n".join(tags))


# Backwards compatibility alias
ContentRendererHook = ContentViewerHook


@define_hook
class SandboxedContentViewerHook(ContentViewerHook):
    """
    A content viewer that uses the Kolibri sandbox with a dynamically loaded handler.

    Subclasses must define:
    - bundle_id: The main viewer bundle ID (inherited from WebpackBundleHook)
    - presets: Tuple of format presets this viewer handles (inherited from ContentViewerHook)

    The sandbox handler is built separately with no Kolibri externals and loaded
    dynamically into the sandbox iframe at runtime.
    """

    #: Bundle ID of the sandbox handler, declared in buildConfig.js with sandbox_handler: true
    sandbox_handler_id = "sandbox_handler"

    @property
    def sandbox_static_path(self):
        """
        Returns the filesystem path to the plugin's static directory.
        """
        return str(files(self._module_path).joinpath("static"))

    @property
    def sandbox_handler_unique_id(self):
        """Full unique ID for the sandbox handler bundle."""
        return f"{self._module_path}.{self.sandbox_handler_id}"

    @property
    def sandbox_handler_url(self):
        """URL to the built sandbox handler JavaScript file."""
        developer_mode = getattr(settings, "DEVELOPER_MODE", False)
        if hasattr(self, "_cached_sandbox_handler_url") and not developer_mode:
            return self._cached_sandbox_handler_url

        unique_id = self.sandbox_handler_unique_id
        chunks = self.resolve_stats(unique_id).get("chunks", {}).get(unique_id, [])
        url = zip_content_static_js_url(chunks, unique_id)
        if url is not None:
            self._cached_sandbox_handler_url = url
        return url

    @property
    def viewer_data(self):
        """
        Extends the base payload with the sandbox handler URL, when built.
        """
        # `define_hook` rebuilds the class through KolibriHookMeta, so the class
        # zero-argument `super()` closes over is not in the instance's MRO.
        data = super(SandboxedContentViewerHook, self).viewer_data
        handler_url = self.sandbox_handler_url
        if handler_url:
            data["sandboxHandlerUrl"] = handler_url
        return data


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
