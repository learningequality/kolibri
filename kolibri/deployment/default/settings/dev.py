from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .base import *  # noqa isort:skip @UnusedWildImport

INSTALLED_APPS = list(INSTALLED_APPS) + ["rest_framework_swagger"]  # noqa F405

INTERNAL_IPS = ["127.0.0.1"]

ROOT_URLCONF = "kolibri.deployment.default.dev_urls"

DEVELOPER_MODE = True

# Create a memcache for each cache
CACHES = {
    key: {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    for key in CACHES.keys()  # noqa F405
}


REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": "kolibri.core.auth.models.KolibriAnonymousUser",
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "EXCEPTION_HANDLER": "kolibri.core.utils.exception_handler.custom_exception_handler",
}
