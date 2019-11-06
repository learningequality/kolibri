from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .dev import *  # noqa

INTERNAL_IPS = ["127.0.0.1"]

DEBUG_TOOLBAR_CONFIG = {"SHOW_TOOLBAR_CALLBACK": lambda x: True}

MIDDLEWARE.append("debug_panel.middleware.DebugPanelMiddleware")  # noqa

INSTALLED_APPS += ["debug_toolbar", "debug_panel"]  # noqa

DEBUG_PANEL_ACTIVE = True

CACHES["debug-panel"] = {  # noqa
    "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
    "LOCATION": "/var/tmp/debug-panel-cache",
    "TIMEOUT": 300,
    "OPTIONS": {"MAX_ENTRIES": 200},
}
