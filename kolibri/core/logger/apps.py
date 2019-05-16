from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriLoggerConfig(AppConfig):
    name = "kolibri.core.logger"
    label = "logger"
    verbose_name = "Kolibri Logger"

    def ready(self):
        pass
