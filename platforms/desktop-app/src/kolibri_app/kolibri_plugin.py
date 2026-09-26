from kolibri.core.device.hooks import GetOSUserHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri_app.login_tokens import LoginTokenManager


class KolibriApp(KolibriPluginBase):
    kolibri_option_defaults = "options_defaults"


@register_hook
class KolibriAppGetOSUserHook(GetOSUserHook):
    # Without the token check, any localhost client holding the (separate)
    # device app key would be auto-logged in as an OS user.
    login_tokens = LoginTokenManager()

    def get_os_user(self, auth_token):
        return self.login_tokens.get_os_user(auth_token)
