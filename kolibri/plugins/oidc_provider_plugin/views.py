from django.core.urlresolvers import reverse
from django.http import JsonResponse
from django.views.generic import View
from oidc_provider import settings as oidc_settings
from oidc_provider.lib.utils.common import get_site_url
from oidc_provider.models import ResponseType


def gen_url(base, key):
    return base + reverse(key)


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
