import pytest

from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user_auth.hooks import LoginItemHook


class ConcreteLoginItem(LoginItemHook):
    label = "Sign in with Example"
    url = "/example/login/"
    icon_url = "/static/example/icon.svg"


@pytest.fixture
def registered_login_item():
    original_module = ConcreteLoginItem.__module__
    ConcreteLoginItem.__module__ = "test.kolibri_plugin"
    hook_cls = register_hook(ConcreteLoginItem)
    hook_cls.add_hook_to_registries()
    yield hook_cls
    hook_cls.remove_hook_from_registries()
    ConcreteLoginItem.__module__ = original_module


def test_login_item_hook_requires_label_url_icon():
    class IncompleteLoginItem(LoginItemHook):
        label = "Missing fields"

    with pytest.raises(TypeError):
        IncompleteLoginItem()


def test_login_item_hook_default_appearance():
    assert LoginItemHook.appearance == "raised-button"


def test_login_item_data_shape(registered_login_item):
    hook = registered_login_item()
    assert hook.data == {
        "label": "Sign in with Example",
        "url": "/example/login/",
        "icon": "/static/example/icon.svg",
        "appearance": "raised-button",
    }


def test_login_item_hook_no_items_registered():
    assert list(LoginItemHook.registered_hooks) == []
