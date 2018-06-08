from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

import kolibri
from ...utils import dbrestore
from ...utils import default_backup_folder
from ...utils import search_latest
from kolibri.utils import server

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    output_transaction = True

    # @ReservedAssignment
    help = (
        "Restores a database backup of Kolibri. This is not intended for "
        "replication across different devices, but *only* for restoring a "
        "single device from a local backup of the database."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'dump_file',
            nargs='?',
            type=str,
            help="Specifies the exact dump file to restore from"
        )
        parser.add_argument(
            '--latest', '-l',
            action='store_true',
            dest='latest',
            help=(
                "Automatically detect and restore from latest backup matching "
                "the major and minor version (X.Y) of current installation."
            )
        )

    def handle(self, *args, **options):

        try:
            server.get_status()
            self.stderr.write(self.style.ERROR(
                "Cannot restore while Kolibri is running, please run:\n"
                "\n"
                "    kolibri stop\n"
            ))
            raise SystemExit()
        except server.NotRunning:
            # Great, it's not running!
            pass

        latest = options['latest']
        use_backup = options.get("dump_file", None)

        if latest == bool(use_backup):
            raise CommandError("Either specify a backup file or use --latest")

        logger.info("Beginning database restore")

        if latest:
            search_root = default_backup_folder()
            use_backup = None
            # Ultimately, we are okay about a backup from a minor release
            fallback_version = ".".join(map(str, kolibri.VERSION[:2]))
            if os.path.exists(search_root):
                use_backup = search_latest(search_root, fallback_version)
            if not use_backup:
                raise RuntimeError(
                    "Could not find a database backup for version: {}".format(
                        fallback_version
                    )
                )

        logger.info("Using backup file: {}".format(use_backup))

        if not os.path.isfile(use_backup):
            raise CommandError("Couldn't find: {}".format(use_backup))

        dbrestore(use_backup)

        self.stdout.write(self.style.SUCCESS(
            "Restored database from: {path}".format(path=use_backup)
        ))
