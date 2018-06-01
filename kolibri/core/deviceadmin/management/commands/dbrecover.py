from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import sys

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from six.moves import input

from ... import utils

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    output_transaction = True

    # @ReservedAssignment
    help = (
        "Use this command if your database is corrupted. This will attempt "
        "to restore the current database, it is not supposed to cause any "
        "loss of data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input',
            action='store_true',
            dest='no_input',
            help=(
                "Skip user prompt before restoring database"
            )
        )

    def handle(self, *args, **options):

        utils.exit_if_kolibri_running(self)

        if 'sqlite3' not in settings.DATABASES['default']['ENGINE']:
            self.stderr.write(
                "Database recovery is only supported for SQLite3."
            )
            sys.exit(1)

        no_input = options.get("no_input", False)

        prompt = (
            "Only use this command to recover a corrupt database. It "
            "would (if successful) recover data without any loss. "
            "Your old database will be backed up in {}. Continue? [y/N)] "
        ).format(utils.default_backup_folder())

        if not no_input:

            cont_response = (input(prompt) or "").lower()
            if cont_response != "y":
                logging.error("Exiting")
                return

        if not utils.check_for_sqlite3():

            self.stderr.write(
                "In order to recover the database, you need the 'sqlite3' "
                "command on your system. We apologize for this, but the "
                "functionality for recovering after database corruption is "
                "only available in this external tool."
            )
            sys.exit(1)

        call_command("dbbackup", external=True)
        call_command("dbrestore", latest=True)
