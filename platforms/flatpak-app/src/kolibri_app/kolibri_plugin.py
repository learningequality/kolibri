import logging
import typing

from gi.repository import Gio
from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.core.device.hooks import GetOSUserHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_PRIVATE_OBJECT_PATH

logger = logging.getLogger(__name__)


class KolibriApp(KolibriPluginBase):
    pass


@register_hook
class GnomeGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token: str) -> typing.Tuple[typing.Optional[str], bool]:
        user_details = _get_user_details(auth_token)

        if not user_details:
            return (None, False)

        # The user details object also includes user_id and full_name, but at
        # the moment we have no way to communicate this to Kolibri.
        return (
            user_details.get("user_name", None),
            user_details.get("is_admin", False),
        )


@register_hook
class GnomeCheckIsMeteredHook(CheckIsMeteredHook):
    def check_is_metered(self) -> bool:
        return Gio.NetworkMonitor.get_default().get_network_metered()


def _get_user_details(auth_token: str) -> typing.Optional[dict]:
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    proxy = Gio.DBusProxy.new_sync(
        bus,
        0,
        None,
        DAEMON_APPLICATION_ID,
        DAEMON_PRIVATE_OBJECT_PATH,
        "org.learningequality.Kolibri.Daemon.Private",
        None,
    )

    try:
        details = proxy.CheckLoginToken("(s)", auth_token)
    except Exception:
        logger.warning("CheckLoginToken failed", exc_info=True)
        return None

    return details
