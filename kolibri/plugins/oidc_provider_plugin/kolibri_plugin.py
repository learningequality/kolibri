from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class OIDCProvider(KolibriPluginBase):
    root_view_urls = "root_urls"
    django_settings = "settings"
    kolibri_options = "options"

    @property
    def url_slug(self):
        return "^oidc_provider/"


@register_hook
class EnableOIDC(OIDCProviderHook):
    pass
