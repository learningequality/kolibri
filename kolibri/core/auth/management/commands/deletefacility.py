import logging

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kolibri.core.auth.errors import FacilityDeletionCountMismatch
from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.utils.delete_facility import FacilityDeleteManager

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "This command initiates the deletion process for a facility and all of its related data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="The ID of the facility to delete",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enforce that deletion count matches expected count",
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle(self, *args, **options):
        noninteractive = options["noninteractive"]
        facility = get_facility(
            facility_id=options["facility"], noninteractive=noninteractive
        )

        logger.info(
            "Found facility %s <%s> for deletion", facility.id, facility.dataset_id
        )

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to permanently delete this facility? This will DELETE ALL DATA FOR THE FACILITY."
            )
            confirm_or_exit(
                "ARE YOU SURE? If you do this, there is no way to recover the facility data on this device."
            )

        try:
            FacilityDeleteManager(facility, strict=options["strict"]).run()
        except FacilityDeletionCountMismatch as e:
            raise CommandError(str(e)) from e
