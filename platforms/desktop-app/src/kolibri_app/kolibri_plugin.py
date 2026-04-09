import getpass

from kolibri.core.device.hooks import GetOSUserHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class KolibriApp(KolibriPluginBase):
    kolibri_option_defaults = "options_defaults"


@register_hook
class KolibriAppGetOSUserHook(GetOSUserHook):
    def get_os_user(self, auth_token):
        try:
            username = getpass.getuser()
        except Exception:
            username = None

        if username:
            return (username, True)
        return (None, False)
