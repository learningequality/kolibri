"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from kolibri.core.tasks.main import queue
from kolibri.core.upgrade import version_upgrade

logger = logging.getLogger(__name__)


# The schema of iceqube DBs changed between these versions
@version_upgrade(old_version="<0.13.0")
def drop_old_iceqube_tables():
    """
    Rather than write a migration for the iceqube database, it is simpler to just drop the tables
    and let iceqube reinitialize the tables from scratch.
    """
    queue.storage.recreate_tables()
