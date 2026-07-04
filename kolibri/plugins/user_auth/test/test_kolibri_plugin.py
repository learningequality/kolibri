from django.test import TestCase

from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user_auth.hooks import LoginItemHook
from kolibri.plugins.user_auth.kolibri_plugin import UserAuthAsset


class UserAuthAssetPluginDataTestCase(TestCase):
    def test_no_login_items_registered(self):
        self.assertEqual(UserAuthAsset().plugin_data["loginItems"], [])

    def test_login_items_registered(self):
        class FakeLoginItem(LoginItemHook):
            label = "Sign in with Fake"
            url = "/fake/login/"
            icon_url = "/static/fake/icon.svg"

        FakeLoginItem.__module__ = "test.kolibri_plugin"
        hook_cls = register_hook(FakeLoginItem)
        hook_cls.add_hook_to_registries()
        self.addCleanup(hook_cls.remove_hook_from_registries)
        self.assertEqual(
            UserAuthAsset().plugin_data["loginItems"],
            [hook_cls().data],
        )
