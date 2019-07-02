from __future__ import absolute_import, print_function, unicode_literals
from kolibri.plugins.base import KolibriPluginBase

from kolibri.core.oidc_provider_hook import OIDCProviderHook


class OIDCProvider(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    root_view_urls = "root_urls"
    django_settings = "settings"

    def url_slug(self):
        return "^oidc_provider/"

    # IMPORTANT: This should be added in case we want to have this feature:
    # https://django-oidc-provider.readthedocs.io/en/latest/sections/sessionmanagement.html#sessionmanagement
    # def __init__(self):
    #     MIDDLEWARE += ["oidc_provider.middleware.SessionManagementMiddleware"]
    #     setattr(settings, 'MIDDLEWARE', MIDDLEWARE)


class EnableOIDC(OIDCProviderHook):
    pass
