"""
No mocks! Ensure that hooks work by extending them and overriding methods with
emulated side-effects.
"""

from __future__ import absolute_import, print_function, unicode_literals


from django.test import TestCase

from .. import hooks


class _WebpackBundleHookSwappedOut(hooks.WebpackBundleHook):
    unique_slug = "i get swapped out"


class _WebpackBundleHookInheritor(_WebpackBundleHookSwappedOut):

    unique_slug = "i get swapped in"

    class Meta:
        replace_parent = True


class WebpackBundleHookTestCase(TestCase):

    def test_replacement(self):
        """
        Test that the parent of ``__WebpackBundleHook`` is no longer in the
        registry
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
