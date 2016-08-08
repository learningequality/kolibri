from __future__ import absolute_import, print_function, unicode_literals

from .api import setup_celery_for_management_commands

from django.apps import AppConfig


class KolibriTasksConfig(AppConfig):
    name = 'kolibri.tasks'
    label = 'kolibritasks'
    verbose_name = 'Kolibri Tasks'

    def ready(self):
        setup_celery_for_management_commands()
