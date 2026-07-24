"""Canonical supervisor-id form for the Android task layer."""

import uuid


def supervisor_id_from_request(request_id):
    """
    WorkManager gives dashed UUIDs; morango stores supervisor_id as dashless
    hex. Both the claim (taskworker) and the reconcile live set
    (task_reconciler) must normalize here, or a completion write looks disowned
    and strands the job in RUNNING.
    """
    return uuid.UUID(str(request_id)).hex
