from django.conf import settings
from django.urls import reverse

from kolibri.core.hooks import LogoutRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user_auth import hooks


class OpenIDConnect(KolibriPluginBase):
    root_view_urls = "root_urls"
    django_settings = "settings"
    kolibri_options = "options"


@register_hook
class LoginItem(webpack_hooks.WebpackBundleHook):
    bundle_id = "openid_login_item"


@register_hook
class LoginItemInclusionHook(hooks.UserAuthSyncHook):
    bundle_class = LoginItem


@register_hook
class EnableOIDCClient(LogoutRedirectHook):
    @property
    def url(self):
        logout_endpoint = settings.OIDC_OP_LOGOUT_ENDPOINT
        if logout_endpoint:
            provider_logout_redirect_url = (
                "{endpoint}/?post_logout_redirect_uri={server}{redirect}".format(
                    endpoint=logout_endpoint,
                    server=settings.OIDC_CLIENT_URL,
                    redirect=reverse(settings.OIDC_AUTHENTICATION_CALLBACK_URL),
                )
            )
        else:
            provider_logout_redirect_url = "/"
        return provider_logout_redirect_url
