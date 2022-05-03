from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

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

try:
    process_cache = CACHES["process_cache"]  # noqa F405
except KeyError:
    process_cache = None

# Create a memcache for each cache
CACHES = {
    key: {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    for key in CACHES  # noqa F405
}

if process_cache:
    CACHES["process_cache"] = process_cache


REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": "kolibri.core.auth.models.KolibriAnonymousUser",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Activate basic auth for external API testing tools
        "rest_framework.authentication.BasicAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "EXCEPTION_HANDLER": "kolibri.core.utils.exception_handler.custom_exception_handler",
}
