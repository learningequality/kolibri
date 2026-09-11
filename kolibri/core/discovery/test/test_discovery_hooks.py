import pytest

from kolibri.core.discovery.hooks import NetworkDiscoveryHook
from kolibri.core.discovery.utils.network.zeroconf_transport import (
    ZeroconfNetworkDiscovery,
)
from kolibri.plugins.hooks import HookSingleInstanceError
from kolibri.plugins.hooks import register_hook


class ConcreteDiscoveryHook(NetworkDiscoveryHook):
    """
    Test-only concrete subclass supplying a stub body for all five abstract
    methods so SingletonMeta can instantiate the singleton when the hook is
    added to the registries.
    """

    def register(self, instance):
        pass

    def update(self, instance, on_rebind):
        pass

    def unregister(self):
        pass

    def start_listening(self, on_add, on_update, on_remove, is_known):
        pass

    def stop_listening(self):
        pass


@pytest.fixture
def register_discovery_hook():
    """Registers fresh hook subclasses against a clean registry."""
    # swap in an empty registry, and restore the real one — which holds the
    # default zeroconf transport — afterwards
    registered_hooks = NetworkDiscoveryHook._registered_hooks
    NetworkDiscoveryHook._registered_hooks = {}

    def register(name):
        Impl = type(
            name, (ConcreteDiscoveryHook,), {"__module__": "test.kolibri_plugin"}
        )
        Hook = register_hook(Impl)
        Hook.add_hook_to_registries()
        return Hook

    yield register

    NetworkDiscoveryHook._registered_hooks = registered_hooks


def test_only_one_transport_may_be_registered(register_discovery_hook):
    register_discovery_hook("OverrideImpl")
    with pytest.raises(HookSingleInstanceError):
        register_discovery_hook("OtherOverrideImpl")


def test_default_transport_is_zeroconf():
    """`kolibri.core.discovery`'s plugin registers zeroconf as the default."""
    assert isinstance(NetworkDiscoveryHook.registered_hook, ZeroconfNetworkDiscovery)
