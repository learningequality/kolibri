from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf import settings

from kolibri.plugins.registry import registered_plugins

# Register any django apps that may have kolibri plugin
# modules inside them
registered_plugins.register_non_plugins(settings.INSTALLED_APPS)
