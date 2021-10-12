"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
from shutil import rmtree

from django.conf import settings

from kolibri.core.upgrade import version_upgrade


# Before 0.15 we copied static files to the KOLIBRI_HOME directory.
# After 0.15 we read them directly from their source directories.
@version_upgrade(old_version="<0.15.0")
def clear_static_dir():
    rmtree(settings.STATIC_ROOT, ignore_errors=True)
