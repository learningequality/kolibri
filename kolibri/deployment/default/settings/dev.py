from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .base import *  # noqa isort:skip @UnusedWildImport

INSTALLED_APPS += ['rest_framework_swagger']  # noqa

INTERNAL_IPS = ['127.0.0.1']

ROOT_URLCONF = 'kolibri.deployment.default.dev_urls'

DEVELOPER_MODE = True
