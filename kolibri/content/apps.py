from __future__ import absolute_import, print_function, unicode_literals

from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = 'kolibri.content'
    label = 'content'
    verbose_name = 'Kolibri Content'

    def ready(self):
        # Initialize bridge for default db/content app here
        # to avoid a race condition during runtime.
        from kolibri.content.utils.sqlalchemybridge import Bridge, DatabaseNotReady

        try:

            default_db_bridge = Bridge(app_name=self.label)

            default_db_bridge.end()

        except DatabaseNotReady:
            pass
