from django.conf import settings
from django.templatetags.static import static
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

from kolibri.core.hooks import LogoutRedirectHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.plugins.user_auth import hooks


class OpenIDConnect(KolibriPluginBase):
    root_view_urls = "root_urls"
    django_settings = "settings"
    kolibri_options = "options"


@register_hook
class OIDCLoginItem(hooks.LoginItemHook):
    label = _("Sign in with OpenID Connect")

    @property
    def url(self):
        return reverse("oidc_client:oidc_authentication_init")

    @property
    def icon_url(self):
        return static("assets/kolibri_oidc_client_plugin/icon.svg")


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
