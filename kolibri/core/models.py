from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf import settings

from kolibri.plugins.registry import register

# Register any django apps that may have kolibri plugin
# modules inside them
register(settings.INSTALLED_APPS)
