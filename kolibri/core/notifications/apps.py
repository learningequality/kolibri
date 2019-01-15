from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig

from .tasks import AsyncNotificationsThread


class KolibriNotificationsConfig(AppConfig):
    name = 'kolibri.core.notifications'
    label = 'notifications'
    verbose_name = 'Kolibri Notifications'

    def ready(self):
        AsyncNotificationsThread.start_command()
