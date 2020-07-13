import os

from kolibri.utils.conf import OPTIONS

# SESSION_COOKIE_NAME = "kolibri_client"
INSTALLED_APPS = ["mozilla_django_oidc"]
AUTHENTICATION_BACKENDS = [
    "kolibri_oidc_client_plugin.auth.OIDCKolibriAuthenticationBackend"
]
OIDC_URL = OPTIONS["OIDCClient"]["PROVIDER_URL"]
OIDC_RP_CLIENT_ID = os.environ.get("CLIENT_ID", "kolibri.app")
OIDC_RP_CLIENT_SECRET = os.environ.get("CLIENT_SECRET", "kolibri.app")
OIDC_RP_SIGN_ALGO = "RS256"
OIDC_AUTHENTICATION_CALLBACK_URL = "oidc_client:oidc_authentication_callback"
OIDC_OP_AUTHORIZATION_ENDPOINT = OPTIONS["OIDCClient"].get(
    "AUTHORIZATION_ENDPOINT", "{}/authorize".format(OIDC_URL)
)
OIDC_OP_JWKS_ENDPOINT = OPTIONS["OIDCClient"].get(
    "JWKS_URI", "{}/jwks".format(OIDC_URL)
)
OIDC_OP_TOKEN_ENDPOINT = OPTIONS["OIDCClient"].get(
    "TOKEN_ENDPOINT", "{}/token".format(OIDC_URL)
)
OIDC_OP_USER_ENDPOINT = OPTIONS["OIDCClient"].get(
    "USERINFO_ENDPOINT", "{}/userinfo".format(OIDC_URL)
)
OIDC_OP_LOGOUT_ENDPOINT = OPTIONS["OIDCClient"].get("ENDSESSION_ENDPOINT", None)
OIDC_CLIENT_URL = OPTIONS["OIDCClient"].get("CLIENT_URL", "")
OIDC_VERIFY_SSL = False
OIDC_TOKEN_USE_BASIC_AUTH = True
OIDC_RP_SCOPES = "openid profile email"
LOGOUT_REDIRECT_URL = "/"
LOGIN_REDIRECT_URL = "/"
