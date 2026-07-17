from inspect import isabstract

import pytest

from kolibri.plugins import hooks


@hooks.define_hook
class HookAbstract(hooks.KolibriHook):
    pass


@hooks.define_hook(only_one_registered=True)
class SingleHookAbstract(hooks.KolibriHook):
    pass


class Hook(HookAbstract):
    pass


class SingleHook(SingleHookAbstract):
    pass


def test_register_hook_not_kolibri_plugin():
    try:
        hooks.register_hook(Hook)
        pytest.fail(
            "Allowed a hook defined outside of a kolibri_plugin module to be registered"
        )
    except RuntimeError:
        pass


@pytest.fixture
def valid_hook():
    original_module = Hook.__module__
    Hook.__module__ = "test.kolibri_plugin"
    yield Hook
    Hook.__module__ = original_module


@pytest.fixture
def valid_single_hook():
    original_module = SingleHook.__module__
    SingleHook.__module__ = "test.kolibri_plugin"
    yield SingleHook
    SingleHook.__module__ = original_module


def test_register_hook_kolibri_plugin(valid_hook):
    hooks.register_hook(valid_hook)


def test_defined_hook_abstract():
    assert isabstract(HookAbstract)


def test_register_hook_single_hook(valid_single_hook):
    hooks.register_hook(valid_single_hook)


def test_register_multiple_hook_single_hook(valid_single_hook):
    valid_single_hook = hooks.register_hook(valid_single_hook)
    valid_single_hook.add_hook_to_registries()

    class OtherSingleHook(SingleHookAbstract):
        pass

    OtherSingleHook.__module__ = "test.kolibri_plugin"
    try:
        OtherSingleHook = hooks.register_hook(OtherSingleHook)
        OtherSingleHook.add_hook_to_registries()
        pytest.fail(
            "Allowed a hook single instance hook to be registered more than once"
        )
    except hooks.HookSingleInstanceError:
        pass


def test_singleton_hook(valid_hook):
    valid_hook = hooks.register_hook(valid_hook)
    assert valid_hook() is valid_hook()


def test_get_hook(valid_hook):
    valid_hook = hooks.register_hook(valid_hook)
    valid_hook.add_hook_to_registries()
    hook = valid_hook()
    assert HookAbstract.get_hook(hook.unique_id) is hook


def test_registered_hooks(valid_hook):
    valid_hook = hooks.register_hook(valid_hook)
    valid_hook.add_hook_to_registries()
    hook = valid_hook()
    assert hook in HookAbstract.registered_hooks
    assert len(list(HookAbstract.registered_hooks)) == 1


@pytest.fixture
def single_hook_set():
    @hooks.define_hook(only_one_registered=True)
    class SingleAbstract(hooks.KolibriHook):
        pass

    class DefaultImpl(SingleAbstract):
        pass

    DefaultImpl.__module__ = "test.kolibri_plugin"

    class OverrideImpl(SingleAbstract):
        pass

    OverrideImpl.__module__ = "test.kolibri_plugin"
    return SingleAbstract, DefaultImpl, OverrideImpl


def test_register_as_default_factory_form(single_hook_set):
    _, DefaultImpl, OverrideImpl = single_hook_set
    Default = hooks.register_hook(as_default=True)(DefaultImpl)
    assert Default()._is_default is True
    Override = hooks.register_hook(OverrideImpl)
    assert Override()._is_default is False


def test_default_only_resolution(single_hook_set):
    SingleAbstract, DefaultImpl, _ = single_hook_set
    Default = hooks.register_hook(as_default=True)(DefaultImpl)
    Default.add_hook_to_registries()
    assert SingleAbstract.registered_hook is Default()


def test_override_only_resolution(single_hook_set):
    SingleAbstract, _, OverrideImpl = single_hook_set
    Override = hooks.register_hook(OverrideImpl)
    Override.add_hook_to_registries()
    assert SingleAbstract.registered_hook is Override()


def test_no_registration_resolution(single_hook_set):
    SingleAbstract, _, _ = single_hook_set
    assert SingleAbstract.registered_hook is None


@pytest.mark.parametrize("default_first", [True, False])
def test_override_prefers_non_default(single_hook_set, default_first):
    SingleAbstract, DefaultImpl, OverrideImpl = single_hook_set
    Default = hooks.register_hook(as_default=True)(DefaultImpl)
    Override = hooks.register_hook(OverrideImpl)
    # Resolution must prefer the non-default regardless of registration order.
    if default_first:
        Default.add_hook_to_registries()
        Override.add_hook_to_registries()
    else:
        Override.add_hook_to_registries()
        Default.add_hook_to_registries()
    assert SingleAbstract.registered_hook is Override()


def test_default_does_not_count_toward_limit(single_hook_set):
    _, DefaultImpl, OverrideImpl = single_hook_set
    Default = hooks.register_hook(as_default=True)(DefaultImpl)
    Default.add_hook_to_registries()
    Override = hooks.register_hook(OverrideImpl)
    # A default must not consume the single-registration slot, so registering a
    # non-default afterward must not raise.
    try:
        Override.add_hook_to_registries()
    except hooks.HookSingleInstanceError:
        pytest.fail("Default registration wrongly counted toward the single limit")


def test_two_non_default_still_raise(single_hook_set):
    SingleAbstract, DefaultImpl, OverrideImpl = single_hook_set
    Default = hooks.register_hook(as_default=True)(DefaultImpl)
    Default.add_hook_to_registries()
    Override = hooks.register_hook(OverrideImpl)
    Override.add_hook_to_registries()

    class ThirdImpl(SingleAbstract):
        pass

    ThirdImpl.__module__ = "test.kolibri_plugin"
    Third = hooks.register_hook(ThirdImpl)
    try:
        Third.add_hook_to_registries()
        pytest.fail(
            "Allowed a second non-default hook to register against a single hook"
        )
    except hooks.HookSingleInstanceError:
        pass


def test_registered_hook_on_non_abstract_raises(single_hook_set):
    _, _, OverrideImpl = single_hook_set
    Override = hooks.register_hook(OverrideImpl)
    try:
        Override.registered_hook
        pytest.fail("registered_hook accessed on a non-abstract hook did not raise")
    except TypeError:
        pass
