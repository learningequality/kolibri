from kolibri.utils.conf import OPTIONS

INSTALLED_APPS = ["oidc_provider"]
OIDC_LOGIN_URL = "/user/#/signin/"
OIDC_USERINFO = "kolibri.plugins.oidc_provider_plugin.kolibri_userinfo"

# for some special purposes, let's break rules and let's not ask for consent:
if OPTIONS["OIDCProvider"]["REQUIRE_CONSENT"]:
    OIDC_TEMPLATES = {
        "authorize": "oidc_provider/authorize.html",
        "error": "oidc_provider/error.html",
    }
else:
    OIDC_TEMPLATES = {
        "authorize": "oidc_provider/authorize_without_consent.html",
        "error": "oidc_provider/error.html",
    }
