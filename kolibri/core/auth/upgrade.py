"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
import logging

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.upgrade import version_upgrade

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
