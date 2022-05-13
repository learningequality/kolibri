"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from sqlalchemy.exc import OperationalError

from kolibri.core.tasks.main import job_storage
from kolibri.core.upgrade import version_upgrade

logger = logging.getLogger(__name__)


# The schema of iceqube DBs changed between version 0.12 and 0.13.
# We have coopted this upgrade to just drop all the data in the job storage
# table from before 0.15, as from 0.15 onwards, we persist jobs in the
# database, rather than clearing at every startup.
# In 0.16 onwards we made schema updates to the job storage table, so we
# updated this upgrade task again to drop all the data in the job storage
@version_upgrade(old_version="<0.16.0")
def drop_old_iceqube_tables():
    """
    Rather than write a migration for the iceqube database, it is simpler to just drop the tables
    and let iceqube reinitialize the tables from scratch.
    """
    try:
        job_storage.recreate_tables()
    except OperationalError:
        logger.warning(
            "Could not recreate job storage table. This is probably because the database already exists and did not need to be recreated."
        )
