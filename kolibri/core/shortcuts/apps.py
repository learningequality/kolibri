from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriShortcutsConfig(AppConfig):
    name = "kolibri.core.shortcuts"
    label = "shortcuts"
    verbose_name = "Kolibri Shortcuts"

    def ready(self):
        pass
