"""
The purpose of this module is to manually test & demonstrate the
entire task submission workflow.

Right now, I've imported the validator from the api module but we'll
shift those to their suitable directories in coming times.
"""
from django.core.management import call_command

from kolibri.core.content.permissions import CanManageContent
from kolibri.core.tasks.api import validate_local_import_task
from kolibri.core.tasks.decorators import register_task


def validate_diskimportcontent(request, request_data):
    task = validate_local_import_task(request, request_data)
    task.update({"type": "DISKCONTENTIMPORT"})
    task["extra_metadata"] = task
    return task


@register_task(
    validator=validate_diskimportcontent,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def importcontentfromdisk(**kwargs):
    call_command(
        "importcontent",
        "disk",
        kwargs["channel_id"],
        kwargs["datafolder"],
        drive_id=kwargs["drive_id"],
        node_ids=kwargs["node_ids"],
        exclude_node_ids=kwargs["exclude_node_ids"],
    )
