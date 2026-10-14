import typing

from gi.repository import Gio

from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.core.device.hooks import GetOSUserHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri_app.login_tokens import login_tokens


class KolibriApp(KolibriPluginBase):
    # The base class sets this to None, so mypy infers its type as None.
    kolibri_option_defaults = "options_defaults"  # type: ignore[assignment]


@register_hook
class GnomeGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token: str) -> typing.Tuple[typing.Optional[str], bool]:
        return login_tokens.get_os_user(auth_token)


@register_hook
class GnomeCheckIsMeteredHook(CheckIsMeteredHook):
    def check_is_metered(self) -> bool:
        return Gio.NetworkMonitor.get_default().get_network_metered()
