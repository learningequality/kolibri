from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = "kolibri.core.content"
    label = "content"
    verbose_name = "Kolibri Content"

    def ready(self):
        # apps.py is imported before the app registry is ready.
        from .signals import add_download_requests  # noqa: PLC0415
        from .signals import add_removal_requests  # noqa: PLC0415
        from .signals import cascade_delete_node  # noqa: F401, PLC0415
        from .signals import reorder_channels_upon_deletion  # noqa: F401, PLC0415
        from .utils.assignment import ContentAssignmentManager  # noqa: PLC0415

        ContentAssignmentManager.on_any_downloadable_assignment(add_download_requests)
        ContentAssignmentManager.on_any_removable_assignment(add_removal_requests)
