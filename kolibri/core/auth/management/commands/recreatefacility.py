import logging

from django.db import transaction

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.utils.migrate import migrate_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    help = "This command initiates the recreation process for a facility and all of its related data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="The ID of the facility to recreate",
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):
        noninteractive = options["noninteractive"]
        facility = get_facility(
            facility_id=options["facility"], noninteractive=noninteractive
        )
        dataset_id = facility.dataset_id

        logger.info(
            "Found facility {} <{}> for recreation".format(facility.id, dataset_id)
        )

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to permanently recreate this facility? This will TRANSFER ALL FACILITY DATA TO A NEW FACILITY."
            )
            confirm_or_exit(
                "ARE YOU SURE? If you do this, there is no way to recover the original facility data."
            )

        logger.info(
            "Proceeding with facility recreation. Recreating all data for facility <{}>".format(
                dataset_id
            )
        )

        with transaction.atomic():
            migrate_facility(facility)

        logger.info("Recreation complete.")
