from django.core.urlresolvers import reverse
from django.http import JsonResponse
from django.views.generic import View
from oidc_provider import settings as oidc_settings
from oidc_provider.lib.utils.common import get_site_url
from oidc_provider.models import ResponseType


class ProviderInfoView(View):
    def get(self, request, *args, **kwargs):
        dic = dict()
        site_url = get_site_url(request=request)
        dic["issuer"] = (
            site_url
            + reverse("kolibri:unwomen:provider-info").split(
                "/.well-known/openid-configuration"
            )[0]
        )
        dic["authorization_endpoint"] = site_url + reverse(
            "kolibri:unwomen:oidc_provider:authorize"
        )
        dic["token_endpoint"] = site_url + reverse(
            "kolibri:unwomen:oidc_provider:token"
        )
        dic["userinfo_endpoint"] = site_url + reverse(
            "kolibri:unwomen:oidc_provider:userinfo"
        )
        dic["end_session_endpoint"] = site_url + reverse(
            "kolibri:unwomen:oidc_provider:end-session"
        )
        dic["introspection_endpoint"] = site_url + reverse(
            "kolibri:unwomen:oidc_provider:token-introspection"
        )

        types_supported = [
            response_type.value for response_type in ResponseType.objects.all()
        ]
        dic["response_types_supported"] = types_supported

        dic["jwks_uri"] = site_url + reverse("kolibri:unwomen:oidc_provider:jwks")

        dic["id_token_signing_alg_values_supported"] = ["HS256", "RS256"]

        # See: http://openid.net/specs/openid-connect-core-1_0.html#SubjectIDTypes
        dic["subject_types_supported"] = ["public"]

        dic["token_endpoint_auth_methods_supported"] = [
            "client_secret_post",
            "client_secret_basic",
        ]

        if oidc_settings.get("OIDC_SESSION_MANAGEMENT_ENABLE"):
            dic["check_session_iframe"] = site_url + reverse(
                "kolibri:unwomen:oidc_provider:check-session-iframe"
            )

        response = JsonResponse(dic)
        response["Access-Control-Allow-Origin"] = "*"

        return response
