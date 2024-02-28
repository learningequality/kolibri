"""
Tiny module to store strings for task notifications for device tasks.
TODO: This can be migrated into kolibri/core/device/tasks.py in 0.17
"""
from kolibri.core.tasks.job import JobStatus
from kolibri.utils.translation import gettext as _


def status_fn(job):
    # Translators: A notification title shown to users when Kolibri is looking for other Kolibri devices on the network.
    searching = _("Searching")
    # Translators: Notification text shown to users when Kolibri is looking for other Kolibri devices on the network.
    notification_text = _("Looking for other Kolibri devices")
    return JobStatus(searching, notification_text)
