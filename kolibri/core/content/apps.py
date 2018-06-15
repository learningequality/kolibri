from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = 'kolibri.core.content'
    label = 'content'
    verbose_name = 'Kolibri Content'

    def ready(self):
        from kolibri.core.content.utils.sqlalchemybridge import prepare_bases
        prepare_bases()
