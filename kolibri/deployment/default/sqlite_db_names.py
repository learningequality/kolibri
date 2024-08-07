"""
Constants for the names of our SQLite databases beyond the default DB.
Keep them here for a single source of truth that can be referenced by apps
and our default settings.
"""

SYNC_QUEUE = "syncqueue"

NETWORK_LOCATION = "networklocation"

NOTIFICATIONS = "notifications"

ERROR_REPORTS = "errorreports"


ADDITIONAL_SQLITE_DATABASES = (
    SYNC_QUEUE,
    NETWORK_LOCATION,
    NOTIFICATIONS,
    ERROR_REPORTS,
)
