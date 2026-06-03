import logging
import sys

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.utils.deprovision import deprovision
from kolibri.core.auth.utils.deprovision import get_deprovision_progress_total
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils.cli import server

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    help = "Delete all facility user data from the local database, and put it back to a clean state (but leaving content as-is)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--destroy-all-user-data",
            action="store_true",
            dest="confirmation1",
            default=False,
        )
        parser.add_argument(
            "--permanent-irrevocable-data-loss",
            action="store_true",
            dest="confirmation2",
            default=False,
        )

    def deprovision(self):
        with self.start_progress(
            total=get_deprovision_progress_total()
        ) as progress_update:
            deprovision(progress_update=progress_update)

    def handle_async(self, *args, **options):
        # safest not to run this command while the server is running
        try:
            server.get_status()
            logger.error(
                "The Kolibri server is currently running. Please stop it and then re-run this command."
            )
            sys.exit(1)
        except server.NotRunning:
            pass

        if not options["confirmation1"]:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to deprovision your database? This will DELETE ALL USER DATA!"
            )

        if not options["confirmation2"]:
            # ensure the user REALLY REALLY wants to do this!
            confirm_or_exit(
                "ARE YOU SURE? If you do this, there is no way to recover the user data on this device."
            )

        logger.info("Proceeding with deprovisioning. Deleting all user data.")
        self.deprovision()
        logger.info("Deprovisioning complete. All user data has been deleted.")
