from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriTasksConfig(AppConfig):
    name = "kolibri.core.tasks"
    label = "kolibritasks"
    verbose_name = "Kolibri Tasks"

    def ready(self):
        pass
