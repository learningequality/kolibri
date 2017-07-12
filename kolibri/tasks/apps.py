from __future__ import absolute_import, print_function, unicode_literals

from django.apps import AppConfig
from django.conf import settings

from barbequeue.client import SimpleClient

client = None


class KolibriTasksConfig(AppConfig):
    name = 'kolibri.tasks'
    label = 'kolibritasks'
    verbose_name = 'Kolibri Tasks'

    def ready(self):
        global client
        client = SimpleClient(app="kolibri", storage_path=settings.QUEUE_JOB_STORAGE_PATH)
        client.clear(force=True)
