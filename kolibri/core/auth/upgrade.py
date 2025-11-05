"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging
import os
import shutil

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.upgrade import version_upgrade
from kolibri.utils import conf

logger = logging.getLogger(__name__)


@version_upgrade(old_version="<0.14.0")
def prune_empty_adhoc_groups():
    """
    We started making adhoc groups for every lesson and quiz, even though they were not
    needed. This upgrade task cleans up those empty adhoc groups.
    """
    AdHocGroup.objects.filter(membership__isnull=True).delete()


@version_upgrade(old_version="<0.15.0")
def name_unnamed_adhoc_groups():
    """
    We started making adhoc groups for every lesson and quiz, even though they were not
    needed. This upgrade task cleans up those empty adhoc groups.
    """
    AdHocGroup.objects.filter(name="").update(name="Ad hoc")


@version_upgrade(old_version="<0.19.0")
def cleanup_legacy_file_sessions():
    """
    Clean up legacy file-based sessions when upgrading to database-backed sessions.
    Removes the sessions directory from KOLIBRI_HOME if it exists.
    """
    session_dir = os.path.join(conf.KOLIBRI_HOME, "sessions")
    if os.path.exists(session_dir):
        try:
            shutil.rmtree(session_dir)
            logger.info(
                "Cleaned up legacy file-based sessions directory: %s", session_dir
            )
        except OSError:
            logger.warning("Failed to remove legacy sessions directory %s", session_dir)
