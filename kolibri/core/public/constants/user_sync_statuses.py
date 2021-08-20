"""
This module contains constants representing the possible statuses
when a SoUD request to sync
"""
from __future__ import unicode_literals


SYNC = "SYNC"  # can begin a sync right now
RECENTLY_SYNCED = "RECENTLY_SYNCED"
SYNCING = "SYNCING"
QUEUED = "QUEUED"
NOT_RECENTLY_SYNCED = "NOT_RECENTLY_SYNCED"
UNABLE_TO_SYNC = "UNABLE_TO_SYNC"
