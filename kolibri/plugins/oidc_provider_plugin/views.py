import oidc_provider.lib.utils.token
import oidc_provider.views
from django.conf import settings
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.http import JsonResponse
from django.http import QueryDict
from django.shortcuts import resolve_url
from django.utils.six.moves.urllib.parse import urlparse
from django.utils.six.moves.urllib.parse import urlunparse
from django.views.generic import View
from oidc_provider import settings as oidc_settings
from oidc_provider.lib.utils.common import get_site_url
from oidc_provider.models import ResponseType


def gen_url(base, key):
    return base + reverse(key)


def monkeypatch_method(cls):
    """ Generic decorator to monkey patch any needed function"""

    def decorator(func):
        setattr(cls, func.__name__, func)
        return func

    return decorator


# This is needed to ensure that `kolibri:oidcprovider` is added to the reverse url search:
@monkeypatch_method(oidc_provider.lib.utils.token)
def get_issuer(site_url=None, request=None):
    """
    Construct the issuer full url. Basically is the site url with some path
    appended.
    """
    site_url = get_site_url(site_url=site_url, request=request)
    path = reverse("kolibri:oidcprovider:provider-info").split(
        "/.well-known/openid-configuration"
    )[0]
    issuer = site_url + path

    return str(issuer)


# This is needed to avoid redirect_to_login moving '#/signin?' to the end of the url:
@monkeypatch_method(oidc_provider.views)
def redirect_to_login(next, login_url=None, redirect_field_name=REDIRECT_FIELD_NAME):
    """
    Redirects the user to the login page, passing the given 'next' page
    """
    resolved_url = resolve_url(login_url or settings.LOGIN_URL)

    login_url_parts = list(urlparse(resolved_url))
    if redirect_field_name:
        querystring = QueryDict(login_url_parts[4], mutable=True)
        querystring[redirect_field_name] = next
        redirect_url = "{root}?{redirection}".format(
            root=resolved_url, redirection=querystring.urlencode(safe="/")
        )
    else:
        redirect_url = urlunparse(login_url_parts)

    return HttpResponseRedirect(redirect_url)


class ProviderInfoView(View):
    def get(self, request, *args, **kwargs):
        base = get_site_url(request=request)
        response_dict = dict()
        response_dict["issuer"] = gen_url(
            base, "kolibri:oidcprovider:provider-info"
        ).split("/.well-known/openid-configuration")[0]
        response_dict["authorization_endpoint"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:authorize"
        )
        response_dict["token_endpoint"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:token"
        )
        response_dict["userinfo_endpoint"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:userinfo"
        )
        response_dict["end_session_endpoint"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:end-session"
        )
        response_dict["introspection_endpoint"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:token-introspection"
        )
        response_dict["response_types_supported"] = [
            response_type.value for response_type in ResponseType.objects.all()
        ]
        response_dict["jwks_uri"] = gen_url(
            base, "kolibri:oidcprovider:oidc_provider:jwks"
        )
        response_dict["id_token_signing_alg_values_supported"] = ["HS256", "RS256"]
        # See: http://openid.net/specs/openid-connect-core-1_0.html#SubjectIDTypes
        response_dict["subject_types_supported"] = ["public"]
        response_dict["token_endpoint_auth_methods_supported"] = [
            "client_secret_post",
            "client_secret_basic",
        ]
        if oidc_settings.get("OIDC_SESSION_MANAGEMENT_ENABLE"):
            response_dict["check_session_iframe"] = gen_url(
                base, "kolibri:oidcprovider:oidc_provider:check-session-iframe"
            )
        response = JsonResponse(response_dict, json_dumps_params={"indent": 2})
        response["Access-Control-Allow-Origin"] = "*"
        return response
