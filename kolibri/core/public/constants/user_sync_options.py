"""
This module contains constants representing options for SoUD sync
"""
from __future__ import unicode_literals

DELAYED_SYNC = 900  # client: seconds to mark sync as not recent

MAX_CONCURRENT_SYNCS = 1  # Server: max number of concurrent syncs allowed
HANDSHAKING_TIME = 5  # Server: minimum time (seconds) considered as the ttl for the next sync request from an enqueued client

STALE_QUEUE_TIME = (
    180  # Server: time (seconds) after which a sync queue entry is considered stale
)
