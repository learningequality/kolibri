from gi.repository import Gio

from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class KolibriApp(KolibriPluginBase):
    # The base class sets this to None, so mypy infers its type as None.
    kolibri_option_defaults = "options_defaults"  # type: ignore[assignment]


@register_hook
class GnomeCheckIsMeteredHook(CheckIsMeteredHook):
    def check_is_metered(self) -> bool:
        return Gio.NetworkMonitor.get_default().get_network_metered()
