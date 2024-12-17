from .dev import *  # noqa

INTERNAL_IPS = ["127.0.0.1"]

INSTALLED_APPS += ["debug_toolbar"]  # noqa

MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa

CACHES["default"]["TIMEOUT"] = 0  # noqa

if "process_cache" in CACHES:  # noqa
    CACHES["process_cache"]["TIMEOUT"] = 0  # noqa
