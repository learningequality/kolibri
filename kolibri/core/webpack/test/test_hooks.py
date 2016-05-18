"""
No mocks! Ensure that hooks work by extending them and overriding methods with
emulated side-effects.
"""

from __future__ import absolute_import, print_function, unicode_literals

from django.test.testcases import TestCase

from .. import hooks
from .base import TestHookMixin


class _WebpackBundleHookSwappedOut(hooks.WebpackBundleHook):
    unique_slug = "i_get_swapped_out"

    src_file = "im_a_source_file"


class _WebpackBundleHookInheritor(_WebpackBundleHookSwappedOut):

    unique_slug = "i_get_swapped_in"

    src_file = "im_a_source_file"

    class Meta:
        replace_parent = True


class _FrontEndCoreAssetHook(hooks.FrontEndCoreAssetHook):
    unique_slug = "im_a_core_hook"

    src_file = "im_a_source_file"

    class Meta:
        replace_parent = True


class _FrontEndASyncAssetHook(TestHookMixin, hooks.WebpackBundleHook):
    unique_slug = "im_an_async_hook"

    src_file = "im_a_source_file"

    events = {
        'some_weird_event_we_are_going_to_look_for': 'value'
    }


class _FrontEndASyncInclusionTargetHook(hooks.FrontEndBaseASyncHook):
    bundle_class = _FrontEndASyncAssetHook


class WebpackBundleHookTestCase(TestCase):

    def test_replacement(self):
        """
        Test that the parent of ``_WebpackBundleHookInheritor`` is no longer in
        the registry. Other tests depend on this.
        """
        registered_types = [
            type(hook) for hook in hooks.WebpackBundleHook().registered_hooks
        ]

        # Assert that
        self.assertNotIn(
            _WebpackBundleHookSwappedOut,
            registered_types
        )
        self.assertIn(
            _WebpackBundleHookInheritor,
            registered_types
        )

    def test_sync_hook(self):

        html = _FrontEndASyncInclusionTargetHook().render_to_page_load_async_html()
        assert not _FrontEndASyncInclusionTargetHook().bundle_class()._meta.abstract
        for event_key in _FrontEndASyncAssetHook.events.keys():
            self.assertIn(
                event_key,
                html,
            )
