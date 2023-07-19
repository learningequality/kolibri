from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.content.signals import add_download_requests
from kolibri.core.content.signals import add_removal_requests
from django.apps import AppConfig

from kolibri.core.content.utils.assignment import ContentAssignmentManager


class KolibriContentConfig(AppConfig):
    name = "kolibri.core.content"
    label = "content"
    verbose_name = "Kolibri Content"

    def ready(self):
        from .signals import reorder_channels_upon_deletion  # noqa: F401
        from .signals import cascade_delete_node  # noqa: F401

        ContentAssignmentManager.on_downloadable_assignment(add_download_requests)
        ContentAssignmentManager.on_removable_assignment(add_removal_requests)
