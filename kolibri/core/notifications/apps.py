from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriNotificationsConfig(AppConfig):
    name = 'kolibri.core.notifications'
    label = 'notifications'
    verbose_name = 'Kolibri Notifications'

    def ready(self):
        # activate signals:
        from .signals import parse_summary_log  # noqa: F401
        from .signals import parse_exam_log  # noqa: F401
