from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import ANONYMOUS
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import is_landing_page
from kolibri.core.device.utils import LANDING_PAGE_LEARN
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class UserAuth(KolibriPluginBase):
    translated_view_urls = "urls"
    root_view_urls = "root_urls"

    @property
    def url_slug(self):
        return "auth"


@register_hook
class UserAuthAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        return {
            "oidcProviderEnabled": OIDCProviderHook.is_enabled(),
            "allowGuestAccess": get_device_setting("allow_guest_access"),
            "isSubsetOfUsersDevice": get_device_setting(
                "subset_of_users_device", False
            ),
        }


@register_hook
class LogInRedirect(RoleBasedRedirectHook):
    @property
    def roles(self):
        if is_landing_page(LANDING_PAGE_LEARN):
            return (None,)

        return (ANONYMOUS,)

    @property
    def url(self):
        return self.plugin_url(UserAuth, "user_auth")


@register_hook
class LogInNavAction(NavigationHook):
    bundle_id = "login_side_nav"
