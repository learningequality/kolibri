import logging
import ntpath
import os

from dateutil import parser
from django.conf import settings
from django.core.management.base import CommandError
from django.utils import translation

from kolibri.core.auth.constants.commands_errors import FILE_WRITE_ERROR
from kolibri.core.auth.constants.commands_errors import INVALID
from kolibri.core.auth.constants.commands_errors import MESSAGES
from kolibri.core.auth.constants.commands_errors import NO_FACILITY
from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import classes_info
from kolibri.core.logger.csv_export import csv_file_generator
from kolibri.core.logger.models import GenerateCSVLogRequest
from kolibri.core.logger.tasks import log_exports_cleanup
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job
from kolibri.utils.time_utils import local_now

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
            "-l",
            "--log-type",
            action="store",
            dest="log_type",
            default="session",
            choices=classes_info.keys(),
            help='Log type to be exported. Valid values are "session" and "summary".',
        )
        parser.add_argument(
            "-w",
            "--overwrite",
            action="store_true",
            dest="overwrite",
            default=False,
            help="Allows overwritten of the exported file in case it exists",
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="Facility id to import the users into",
        )
        parser.add_argument(
            "--locale",
            action="store",
            type=str,
            default=None,
            help="Code of the language for the messages to be translated",
        )
        parser.add_argument(
            "--start_date",
            action="store",
            dest="start_date",
            default=None,
            type=str,
            help="Start date for date range selection of log files. Valid value is an ISO string formatted as YYYY-MM-DDTHH:MM:SS",
        )
        parser.add_argument(
            "--end_date",
            action="store",
            dest="end_date",
            default=None,
            type=str,
            help="End date for date range selection of log files. Valid value is an ISO string formatted as YYYY-MM-DDTHH:MM:SS",
        )

    def get_facility(self, options):
        if options["facility"]:
            default_facility = Facility.objects.get(pk=options["facility"])
        else:
            default_facility = Facility.get_default_facility()

        return default_facility

    def validate_date(self, date_str):
        try:
            return bool(parser.parse(date_str))
        except ValueError:
            return False

    def handle_async(self, *args, **options):

        # set language for the translation of the messages
        locale = settings.LANGUAGE_CODE if not options["locale"] else options["locale"]
        translation.activate(locale)
        self.overall_error = ""
        job = get_current_job()

        start_date = options["start_date"]
        end_date = options["end_date"]

        facility = self.get_facility(options)
        if not facility:
            self.overall_error = str(MESSAGES[NO_FACILITY])

        elif start_date is not None and not self.validate_date(start_date):
            self.overall_error = str(MESSAGES[INVALID]).format("start_date")

        elif end_date is not None and not self.validate_date(end_date):
            self.overall_error = str(MESSAGES[INVALID]).format("end_date")

        else:
            log_type = options["log_type"]

            log_info = classes_info[log_type]

            if options["output_file"] is None:
                filename = log_info["filename"].format(
                    facility.name, facility.id[:4], start_date[:10], end_date[:10]
                )
            else:
                filename = options["output_file"]

            filepath = os.path.join(os.getcwd(), filename)

            queryset = log_info["queryset"]

            total_rows = queryset.count()

            with self.start_progress(total=total_rows) as progress_update:
                try:
                    for row in csv_file_generator(
                        facility,
                        log_type,
                        filepath,
                        start_date=start_date,
                        end_date=end_date,
                        overwrite=options["overwrite"],
                    ):
                        progress_update(1)
                except (ValueError, IOError) as e:
                    self.overall_error = str(MESSAGES[FILE_WRITE_ERROR].format(e))

        if job:
            job.extra_metadata["overall_error"] = self.overall_error
            self.job.extra_metadata["filename"] = ntpath.basename(filepath)
            job.save_meta()
        else:
            if self.overall_error:
                raise CommandError(self.overall_error)
            else:
                logger.info(
                    "Created csv file {} with {} lines".format(filepath, total_rows)
                )

        translation.deactivate()

        # create or update record of log request
        GenerateCSVLogRequest.objects.update_or_create(
            log_type=log_type,
            facility=facility,
            defaults={
                "selected_start_date": start_date
                if start_date is None
                else parser.parse(start_date),
                "selected_end_date": end_date
                if end_date is None
                else parser.parse(end_date),
                "date_requested": local_now(),
            },
        )
        log_exports_cleanup.enqueue()
