"""
Constants for the names of our SQLite databases beyond the default DB.
Keep them here for a single source of truth that can be referenced by apps
and our default settings.
"""

import os

from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS

SYNC_QUEUE = "syncqueue"

NETWORK_LOCATION = "networklocation"

NOTIFICATIONS = "notifications"

SESSIONS = "sessions"

JOB_STORAGE = "job_storage"


ADDITIONAL_SQLITE_DATABASES = (
    SYNC_QUEUE,
    NETWORK_LOCATION,
    NOTIFICATIONS,
    SESSIONS,
    JOB_STORAGE,
)


def get_sqlite_database_path(db_name):
    """
    Get the path for a specific SQLite database.
    """

    if db_name == "default":
        main_db_name = OPTIONS["Database"]["DATABASE_NAME"] or "db.sqlite3"
        return os.path.join(KOLIBRI_HOME, main_db_name)

    if db_name not in ADDITIONAL_SQLITE_DATABASES:
        raise ValueError(
            f"Unknown database name '{db_name}'. "
            f"Use 'default' or one of: {', '.join(ADDITIONAL_SQLITE_DATABASES)}"
        )

    if db_name == JOB_STORAGE:
        # JOB_STORAGE uses a custom file path from the config
        job_storage_path = OPTIONS["Tasks"]["JOB_STORAGE_FILEPATH"]
        if not os.path.isabs(job_storage_path):
            job_storage_path = os.path.join(KOLIBRI_HOME, job_storage_path)

        return job_storage_path

    return os.path.join(KOLIBRI_HOME, "{}.sqlite3".format(db_name))
