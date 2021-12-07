import logging
import sys

from morango.models import Buffer
from morango.models import Certificate
from morango.models import DatabaseIDModel
from morango.models import DeletedModels
from morango.models import Store

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.utils.cli import server

logger = logging.getLogger(__name__)

MODELS_TO_DELETE = [
    AttemptLog,
    ContentSessionLog,
    ContentSummaryLog,
    FacilityUser,
    FacilityDataset,
    Certificate,
    DatabaseIDModel,
    Store,
    Buffer,
    DevicePermissions,
    DeletedModels,
    DeviceSettings,
]


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
        with DisablePostDeleteSignal(), self.start_progress(
            total=len(MODELS_TO_DELETE)
        ) as progress_update:
            for Model in MODELS_TO_DELETE:
                Model.objects.all().delete()
                progress_update(1)

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

        print("Proceeding with deprovisioning. Deleting all user data.")
        self.deprovision()
        print("Deprovisioning complete. All user data has been deleted.")
