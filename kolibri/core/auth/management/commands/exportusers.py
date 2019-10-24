import logging
import os
import sys

from django.core.management.base import CommandError

from kolibri.core.auth.csv_utils import csv_file_generator
from kolibri.core.auth.csv_utils import infer_facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "-O",
            "--output-file",
            action="store",
            dest="output_file",
            default=None,
            type=str,
            help="The generated file will be saved with this name",
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id or name to export the users from",
        )
        parser.add_argument(
            "-w",
            "--overwrite",
            action="store_true",
            dest="overwrite",
            default=True,
            help="Allows overwritten of the exported file in case it exists",
        )
        parser.add_argument(
            "-d",
            "--demographic-data",
            action="store_true",
            dest="demographic",
            default=False,
            help="Include demographic data in exported CSV",
        )

    def handle_async(self, *args, **options):
        try:
            facility = infer_facility(options["facility"])
        except ValueError as e:
            raise CommandError(str(e))

        if options["output_file"] is None:
            filename = "exported_users_{}.csv".format(facility.id)
        else:
            filename = options["output_file"]

        filepath = os.path.join(os.getcwd(), filename)

        total_rows = FacilityUser.objects.filter(facility=facility).count()

        with self.start_progress(total=total_rows) as progress_update:
            try:
                for row in csv_file_generator(
                    facility,
                    filepath,
                    overwrite=options["overwrite"],
                    demographic=options["demographic"],
                ):
                    progress_update(1)
            except (ValueError, IOError) as e:
                logger.error("Error trying to write csv file: {}".format(e))
                sys.exit(1)
