import logging
import ntpath
import os

from django.conf import settings
from django.core.management.base import CommandError
from django.utils import translation

from kolibri.core.auth.constants.commands_errors import FILE_WRITE_ERROR
from kolibri.core.auth.constants.commands_errors import MESSAGES
from kolibri.core.auth.constants.commands_errors import NO_FACILITY
from kolibri.core.auth.models import Facility
from kolibri.core.logger.csv_export import classes_info
from kolibri.core.logger.csv_export import csv_file_generator
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.tasks.utils import get_current_job

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

    def get_facility(self, options):
        if options["facility"]:
            default_facility = Facility.objects.get(pk=options["facility"])
        else:
            default_facility = Facility.get_default_facility()

        return default_facility

    def handle_async(self, *args, **options):

        # set language for the translation of the messages
        locale = settings.LANGUAGE_CODE if not options["locale"] else options["locale"]
        translation.activate(locale)

        self.overall_error = ""
        job = get_current_job()

        facility = self.get_facility(options)
        if not facility:
            self.overall_error = str(MESSAGES[NO_FACILITY])

        else:
            log_type = options["log_type"]

            log_info = classes_info[log_type]

            if options["output_file"] is None:
                filename = log_info["filename"].format(facility.name, facility.id[:4])
            else:
                filename = options["output_file"]

            filepath = os.path.join(os.getcwd(), filename)

            queryset = log_info["queryset"]

            total_rows = queryset.count()

            with self.start_progress(total=total_rows) as progress_update:
                try:
                    for row in csv_file_generator(
                        facility, log_type, filepath, overwrite=options["overwrite"]
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
