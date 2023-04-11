from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.apps import AppConfig


class KolibriAuthConfig(AppConfig):
    name = "kolibri.core.auth"
    label = "kolibriauth"
    verbose_name = "Kolibri Auth"

    def ready(self):
        from .signals import cascade_delete_membership  # noqa: F401
        from .signals import cascade_delete_user  # noqa: F401
