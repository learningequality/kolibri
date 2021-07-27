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

        from kolibri.core.auth.sync_event_hook_utils import (
            register_sync_event_handlers,
        )  # noqa: F401
        from morango.api.viewsets import session_controller  # noqa: F401

        register_sync_event_handlers(session_controller)
