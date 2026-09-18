from kolibri.core.discovery.hooks import NetworkDiscoveryHook
from kolibri.core.discovery.utils.network.zeroconf_transport import (
    ZeroconfNetworkDiscovery,
)
from kolibri.plugins.hooks import register_hook


@register_hook(as_default=True)
class ZeroconfNetworkDiscoveryHook(ZeroconfNetworkDiscovery, NetworkDiscoveryHook):
    """The built-in transport; a platform may override it with a non-default hook."""
