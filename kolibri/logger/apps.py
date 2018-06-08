from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriLoggerConfig(AppConfig):
    name = 'kolibri.logger'
    label = 'logger'
    verbose_name = 'Kolibri Logger'

    def ready(self):
        from .signals import content_session_receiver
        assert content_session_receiver
