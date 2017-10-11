from __future__ import absolute_import, print_function, unicode_literals

import logging
import os
import re
import shutil

import kolibri
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections
from kolibri.dist.django.core.management.base import CommandError
from kolibri.utils.cli import default_backup_folder

logger = logging.getLogger(__name__)


def get_dtm_from_backup_name(fname):
    """
    Returns the date time string from our automated backup filenames
    """
    p = re.compile(r"^db\-v[^_]+_(?P<dtm>[\d\-_]+).*\.sqlite3$")
    m = p.search(fname)
    if m:
        return m.groups("dtm")[0]
    raise ValueError(
        "Tried to get date component of unparsed filename: {}".format(fname)
    )


def is_full_version(fname):
    """
    Tells us if a backup file name is named as if it's from the exact same
    version.

    Supposes versions do not contain underscores '_'
    """
    # Can contain suffixes denoting alpha, beta, post, dev etc.
    full_version = kolibri.__version__
    return fname.startswith(
        "db-v{}_".format(full_version)
    )


class Command(BaseCommand):

    output_transaction = True

    # @ReservedAssignment
    help = (
        "Restores a database backup of Kolibri. This is not intended for "
        "replication across different devices, but rather as restoring a "
        "single device from a local backup of the database."
    )

    def add_arguments(self, parser):
        parser.add_argument('dump_file', nargs='?', type=str)
        parser.add_argument(
            '--latest', '-l',
            action='store_true',
            dest='latest',
            help='Automatically detect and restore from latest backup matching'
        )

    def handle(self, *args, **options):

        latest = options['latest']
        use_backup = args[0] if len(args) > 0 else None
        dst_db_file = settings.DATABASES['default']['NAME']

        if latest == bool(use_backup):
            raise CommandError("Either specify a backup file or use --latest")

        if 'sqlite3' not in settings.DATABASES['default']['ENGINE']:
            raise CommandError("Not configured to use sqlite3")

        if connections['default'].is_in_memory_db(dst_db_file):
            raise CommandError("Cannot restore to in-memory DB")

        logger.info("Beginning database restore")

        if latest:
            search_root = default_backup_folder()
            use_backup = None
            # Ultimately, we are okay about a backup from a minor release
            fallback_version = ".".join(map(str, kolibri.VERSION[:2]))
            if os.path.exists(search_root):
                use_backup = self.search_latest(search_root, fallback_version)
            if not use_backup:
                raise RuntimeError(
                    "Could not find a database backup for version: {}".format(
                        fallback_version
                    )
                )

        logger.info("Using backup file: {}".format(use_backup))

        if not os.path.isfile(use_backup):
            raise CommandError("Couldn't find: {}".format(use_backup))

        shutil.copy2(use_backup, dst_db_file)

        logger.success("Restored database.")
        logger.success("{} to {}".format(use_backup, dst_db_file))

    def search_latest(self, search_root, fallback_version):
        logger.info("Searching latest backup in {}...".format(search_root))

        newest = None  # Should be a path/filename.sqlite3
        newest_dtm = None

        # All file names have to be according to the fall back version.
        prefix = "db-{}".format(fallback_version)

        backups = os.listdir(search_root)
        backups = filter(lambda f: f.endswith(".sqlite3"), backups)
        backups = filter(lambda f: f.startswith(prefix), backups)

        # Everything is sorted alphanumerically, and since dates in the
        # filenames behave accordingly, we can now traverse the list
        # without having to access meta data, just use the file name.
        backups = backups.sort()

        for backup in backups:
            dtm = get_dtm_from_backup_name(backup)
            # Always pick the newest version
            if is_full_version(backup) or dtm > newest_dtm:
                newest_dtm = dtm
                newest = backup

        if newest:
            return os.path.join(search_root, newest)
