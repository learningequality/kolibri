import os

from .base import *  # noqa isort:skip @UnusedWildImport

DEBUG = True

# Settings might be tuples, so switch to lists
INSTALLED_APPS = list(INSTALLED_APPS) + ["drf_yasg"]  # noqa F405
webpack_middleware = "kolibri.core.webpack.middleware.WebpackErrorHandler"
no_login_popup_middleware = (
    "kolibri.core.auth.middleware.XhrPreventLoginPromptMiddleware"
)
MIDDLEWARE = list(MIDDLEWARE) + [  # noqa F405
    webpack_middleware,
    no_login_popup_middleware,
]

INTERNAL_IPS = ["127.0.0.1"]

ROOT_URLCONF = "kolibri.deployment.default.dev_urls"

DEVELOPER_MODE = True
os.environ.update({"KOLIBRI_DEVELOPER_MODE": "True"})


REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": "kolibri.core.auth.models.KolibriAnonymousUser",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Always keep this first, so that we consistently return 403 responses
        # when a request is unauthenticated.
        "rest_framework.authentication.SessionAuthentication",
        # Activate basic auth for external API testing tools
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "EXCEPTION_HANDLER": "kolibri.core.utils.exception_handler.custom_exception_handler",
}

SWAGGER_SETTINGS = {"DEFAULT_INFO": "kolibri.deployment.default.dev_urls.api_info"}
