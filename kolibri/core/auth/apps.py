from django.apps import AppConfig


class KolibriAuthConfig(AppConfig):
    name = "kolibri.core.auth"
    label = "kolibriauth"
    verbose_name = "Kolibri Auth"

    def ready(self):
        from .signals import cascade_delete_membership  # noqa: F401
        from .signals import cascade_delete_user  # noqa: F401

        from kolibri.core.auth.sync_event_hook_utils import (
            pre_sync_transfer_handler,
            post_sync_transfer_handler,
        )  # noqa: F401
        from morango.api.viewsets import session_controller  # noqa: F401

        # attach to `initializing.completed` signal so that the context has all information needed
        # for the handler and any hooks invoked by it
        session_controller.signals.initializing.completed.connect(
            pre_sync_transfer_handler
        )
        session_controller.signals.cleanup.completed.connect(post_sync_transfer_handler)
