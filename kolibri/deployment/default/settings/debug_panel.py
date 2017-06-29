from __future__ import absolute_import, print_function, unicode_literals

from .base import *  # noqa

INTERNAL_IPS = ['127.0.0.1']

DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": lambda x: True,
}

MIDDLEWARE_CLASSES = (
    'debug_panel.middleware.DebugPanelMiddleware',
) + MIDDLEWARE_CLASSES  # noqa

INSTALLED_APPS += [  # noqa
    'debug_toolbar',
    'debug_panel',
]

ENABLE_DATA_BOOTSTRAPPING = False

DEBUG_PANEL_ACTIVE = True
