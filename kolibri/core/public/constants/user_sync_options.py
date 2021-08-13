"""
This module contains constants representing options for SoUD sync
"""
from __future__ import unicode_literals

SYNC_INTERVAL = 5  # client: recommended seconds between sync intervals
DELAYED_SYNC = 900  # client: seconds to mark sync as not recent

MAX_CONCURRENT_SYNCS = 1  # Server: max number of concurrent syncs allowed
HANDSHAKING_TIME = 5  # Server: minimum time (seconds) considered as the ttl for the next sync request from an enqueued client
