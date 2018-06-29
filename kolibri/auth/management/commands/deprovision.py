import logging as logger
import sys

from django.db.models.signals import post_delete
from django.utils.six.moves import input
from morango.certificates import Certificate
from morango.models import Buffer
from morango.models import DatabaseIDModel
from morango.models import DeletedModels
from morango.models import Store

from kolibri.auth.models import FacilityDataset
from kolibri.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.logger.models import AttemptLog
from kolibri.logger.models import ContentSessionLog
from kolibri.logger.models import ContentSummaryLog
from kolibri.tasks.management.commands.base import AsyncCommand
from kolibri.utils.cli import server

logging = logger.getLogger(__name__)

MODELS_TO_DELETE = [
    AttemptLog, ContentSessionLog, ContentSummaryLog, FacilityUser, FacilityDataset, Certificate,
    DatabaseIDModel, Store, Buffer, DevicePermissions, DeletedModels, DeviceSettings
]

# we want to disable the post_delete signal temporarily when deleting, so morango doesn't create DeletedModels objects
class DisablePostDeleteSignal(object):

    def __enter__(self):
        self.receivers = post_delete.receivers
        post_delete.receivers = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        post_delete.receivers = self.receivers
        self.receivers = None


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


class Command(AsyncCommand):
    help = "Delete all facility user data from the local database, and put it back to a clean state (but leaving content as-is)."

    def deprovision(self):
        with DisablePostDeleteSignal(), self.start_progress(total=len(MODELS_TO_DELETE)) as progress_update:
            for Model in MODELS_TO_DELETE:
                Model.objects.all().delete()
                progress_update(1)

    def handle_async(self, *args, **options):

        # safest not to run this command while the server is running
        status_code, _ = server.get_urls()
        if status_code == server.STATUS_RUNNING:
            logging.error("The Kolibri server is currently running. Please stop it and then re-run this command.")
            sys.exit(1)

        # ensure the user REALLY wants to do this!
        confirm_or_exit("Are you sure you wish to deprovision your database? This will DELETE ALL USER DATA!")
        confirm_or_exit("ARE YOU SURE? If you do this, there is no way to recover the user data on this device.")

        print("Proceeding with deprovisioning. Deleting all user data.")
        self.deprovision()
        print("Deprovisioning complete. All user data has been deleted.")
