"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""

import logging
import os
import shutil

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Facility
from kolibri.core.auth.tasks import enqueue_automatic_kdp_sync
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


@version_upgrade(old_version="<0.19.3")
def enqueue_kdp_sync_for_registered_facilities():
    """
    For facilities already registered with KDP, enqueue automatic daily syncing.
    Previously, registration did not set up recurring syncs.
    """
    for facility in Facility.objects.filter(dataset__registered=True):
        enqueue_automatic_kdp_sync(facility)


@version_upgrade(old_version="<0.19.5")
def make_foreign_keys_deferrable():
    """
    Prior to Django 2.0, SQLite tables were created with immediate foreign key constraints, e.g.::

        "parent_id" char(32) NULL REFERENCES "kolibriauth_collection" ("id")

    Since Kolibri upgraded to Django 3.2 (straight from 1.11) the same column is created as::

        "parent_id" char(32) NULL REFERENCES "kolibriauth_collection" ("id") DEFERRABLE INITIALLY DEFERRED

    Django relies on deferred constraint checking for correct cascade-deletion ordering. Databases
    created before Kolibri 0.17 (Django 1.11) therefore retain immediate constraints, which can
    raise ``IntegrityError: FOREIGN KEY constraint failed`` during operations such as sync
    deserialization once foreign key enforcement is enabled at the database level (the default since
    Django 2.0).

    Kolibri 0.17 saw the Django upgrade, but for this version upgrade, we apply it based on the
    version of its release, so we can ensure all databases are migrated properly.
    """
    from morango.deferrable_foreign_keys import MakeForeignKeysDeferrable

    # morango takes care of itself, through its own migration
    op = MakeForeignKeysDeferrable(exclude_app_labels=["morango"])
    op.run()
