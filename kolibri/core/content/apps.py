from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = "kolibri.core.content"
    label = "content"
    verbose_name = "Kolibri Content"

    def ready(self):
        from .utils.assignment import ContentAssignmentManager  # noqa: F401
        from .signals import add_download_requests  # noqa: F401
        from .signals import add_removal_requests  # noqa: F401
        from .signals import reorder_channels_upon_deletion  # noqa: F401
        from .signals import cascade_delete_node  # noqa: F401

        ContentAssignmentManager.on_any_downloadable_assignment(add_download_requests)
        ContentAssignmentManager.on_any_removable_assignment(add_removal_requests)
