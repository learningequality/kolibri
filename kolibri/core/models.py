from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf import settings
from django.db.models.query import F

from kolibri.plugins.registry import registered_plugins

# Register any django apps that may have kolibri plugin
# modules inside them
registered_plugins.register_non_plugins(settings.INSTALLED_APPS)

# Fixes issue using OuterRef within Cast() that is patched in later Django version
# Patch from https://github.com/django/django/commit/c412926a2e359afb40738d8177c9f3bef80ee04e
# https://code.djangoproject.com/ticket/29142
F.relabeled_clone = lambda self, relabels: self
