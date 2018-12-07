from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .dev import *  # noqa

INTERNAL_IPS = ['127.0.0.1']

DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": lambda x: True,
}

MIDDLEWARE.append(  # noqa
    'debug_panel.middleware.DebugPanelMiddleware',
)

INSTALLED_APPS += [  # noqa
    'debug_toolbar',
    'debug_panel',
]

DEBUG_PANEL_ACTIVE = True
