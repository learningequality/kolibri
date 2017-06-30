from __future__ import absolute_import, print_function, unicode_literals

from django.apps import AppConfig


class KolibriTasksConfig(AppConfig):
    name = 'kolibri.tasks'
    label = 'kolibritasks'
    verbose_name = 'Kolibri Tasks'

    def ready(self):
        from kolibri.tasks.api import client
        client.clear(force=True)
