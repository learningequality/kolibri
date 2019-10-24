from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os

import click
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

import kolibri
from ...utils import dbrestore
from ...utils import default_backup_folder
from ...utils import get_dtm_from_backup_name
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
        parser_group = parser.add_mutually_exclusive_group(required=True)
        parser_group.add_argument(
            "dump_file",
            nargs="?",
            type=str,
            help="Specifies the exact dump file to restore from",
        )
        parser_group.add_argument(
            "--latest",
            "-l",
            action="store_true",
            dest="latest",
            help=(
                "Automatically detect and restore from latest backup matching "
                "the major and minor version (X.Y) of current installation."
            ),
        )
        parser_group.add_argument(
            "--select",
            "-s",
            action="store_true",
            dest="select",
            help=(
                "Show the list of the last 10 backups Kolibri has done automatically "
                "for the user to select which one must be restored."
            ),
        )

    def fetch_latest(self, dumps_root):
        """
        Returns the latest backup file available in the dumps_root directory
        """
        use_backup = None
        # Ultimately, we are okay about a backup from a minor release
        fallback_version = ".".join(map(str, kolibri.VERSION[:2]))
        if os.path.exists(dumps_root):
            use_backup = search_latest(dumps_root, fallback_version)
        if not use_backup:
            raise CommandError(
                "Could not find a database backup for version: {}".format(
                    fallback_version
                )
            )
        return use_backup

    def select_backup(self, dumps_root):
        """
        Returns the latest 10 dumps available in the dumps_root directory.
        Dumps are sorted by date, latests first
        """
        backups = []
        if os.path.exists(dumps_root):
            backups = os.listdir(dumps_root)
            backups = filter(lambda f: f.endswith(".dump"), backups)
            backups = list(backups)
            backups.sort(key=get_dtm_from_backup_name, reverse=True)
            backups = backups[:10]  # don't show more than 10 backups

        if not backups:
            raise CommandError("Could not find a database backup}")
        # Shows a list of options to select from
        selected_backup = click.prompt(
            "Type the number in brackets to select the backup to be restored\n"
            + "".join(
                (
                    "({num}) {backup}\n".format(
                        num=num + 1, backup=get_dtm_from_backup_name(backup)
                    )
                    for num, backup in enumerate(backups)
                )
            ),
            type=click.Choice([str(i) for i in range(1, len(backups) + 1)]),
        )
        return os.path.join(dumps_root, backups[int(selected_backup) - 1])

    def handle(self, *args, **options):
        try:
            server.get_status()
            self.stderr.write(
                self.style.ERROR(
                    "Cannot restore while Kolibri is running, please run:\n"
                    "\n"
                    "    kolibri stop\n"
                )
            )
            raise SystemExit()
        except server.NotRunning:
            # Great, it's not running!
            pass

        latest = options["latest"]
        select = options["select"]
        use_backup = options.get("dump_file", None)

        logger.info("Beginning database restore")

        search_root = default_backup_folder()

        if latest:
            use_backup = self.fetch_latest(search_root)
        elif select:
            use_backup = self.select_backup(search_root)

        logger.info("Using backup file: {}".format(use_backup))

        if not os.path.isfile(use_backup):
            raise CommandError("Couldn't find: {}".format(use_backup))

        dbrestore(use_backup)

        self.stdout.write(
            self.style.SUCCESS("Restored database from: {path}".format(path=use_backup))
        )
