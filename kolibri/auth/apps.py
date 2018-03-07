from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriAuthConfig(AppConfig):
    name = 'kolibri.auth'
    label = 'kolibriauth'
    verbose_name = 'Kolibri Auth'

    def ready(self):
        from .signals import cascade_delete_membership  # noqa: F401
