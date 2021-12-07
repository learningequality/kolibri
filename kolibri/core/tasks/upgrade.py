"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.main import scheduler
from kolibri.core.upgrade import version_upgrade

logger = logging.getLogger(__name__)


# The schema of iceqube DBs changed between version 0.12 and 0.13.
# We have coopted this upgrade to just drop all the data in the job storage
# table from before 0.15, as from 0.15 onwards, we persist jobs in the
# database, rather than clearing at every startup.
@version_upgrade(old_version="<0.15.0")
def drop_old_iceqube_tables():
    """
    Rather than write a migration for the iceqube database, it is simpler to just drop the tables
    and let iceqube reinitialize the tables from scratch.
    """
    job_storage.recreate_tables()
    scheduler.recreate_tables()
