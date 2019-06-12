# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os

from kolibri.deployment.default.settings.base import AUTHENTICATION_BACKENDS
from kolibri.deployment.default.settings.base import INSTALLED_APPS

INSTALLED_APPS += ["mozilla_django_oidc"]

# OIDC SETUP
AUTHENTICATION_BACKENDS += [
    'openid_connect.auth.OIDCKolibriAuthenticationBackend',
]
OIDC_URL = os.environ.get('API_URL', 'http://127.0.0.1:5002/oauth')

OIDC_SETTINGS = {
    'AUTHENTICATION_BACKENDS': AUTHENTICATION_BACKENDS,
    'INSTALLED_APPS': INSTALLED_APPS,
    'OIDC_URL': OIDC_URL,
    'OIDC_RP_CLIENT_ID': os.environ.get('CLIENT_ID', 'kolibri.app'),
    'OIDC_RP_CLIENT_SECRET': os.environ.get('CLIENT_SECRET', 'kolibri.app'),
    'OIDC_RP_SIGN_ALGO': 'RS256',
    'OIDC_AUTHENTICATION_CALLBACK_URL': "kolibri:openidconnect:oidc_authentication_callback",
    'OIDC_OP_AUTHORIZATION_ENDPOINT': '{}/authorize'.format(OIDC_URL),
    'OIDC_OP_JWKS_ENDPOINT': '{}/jwks'.format(OIDC_URL),
    'OIDC_OP_TOKEN_ENDPOINT': '{}/token'.format(OIDC_URL),
    'OIDC_OP_USER_ENDPOINT': '{}/userinfo'.format(OIDC_URL),
    'OIDC_VERIFY_SSL': False,
    'OIDC_TOKEN_USE_BASIC_AUTH': True,
    'OIDC_RP_SCOPES': "openid profile",
    'LOGOUT_REDIRECT_URL': '/',
    'LOGIN_REDIRECT_URL': '/',
}
