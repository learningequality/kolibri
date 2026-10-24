import pytest

from kolibri.core.device.hooks import GetOSUserHook
from kolibri.core.device.login_tokens import OSUserInfo
from kolibri.plugins.hooks import register_hook

PLATFORM_OS_USER = OSUserInfo("platform", "platform", "Platform User", True)


class PlatformGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token):
        return PLATFORM_OS_USER


@pytest.fixture
def platform_hook():
    registered_hooks = dict(GetOSUserHook._registered_hooks)
    Hook = register_hook(
        type(
            "PlatformGetOSUserHook",
            (PlatformGetOSUserHook,),
            {"__module__": "test.kolibri_plugin"},
        )
    )
    Hook.add_hook_to_registries()
    yield
    GetOSUserHook._registered_hooks = registered_hooks


def test_platform_hook_overrides_core_default(platform_hook):
    assert GetOSUserHook.retrieve_os_user("token") == PLATFORM_OS_USER
