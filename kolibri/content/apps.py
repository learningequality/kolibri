from __future__ import absolute_import, print_function, unicode_literals

from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = 'kolibri.content'
    label = 'content'
    verbose_name = 'Kolibri Content'

    def ready(self):
        from kolibri.content.utils.sqlalchemybridge import prepare_bases
        prepare_bases()
