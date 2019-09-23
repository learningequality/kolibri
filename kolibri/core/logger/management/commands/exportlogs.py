import logging
import os
import sys

from kolibri.core.logger.csv_export import classes_info
from kolibri.core.logger.csv_export import csv_file_generator
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

    def handle_async(self, *args, **options):
        log_type = options["log_type"]

        log_info = classes_info[log_type]

        if options["output_file"] is None:
            filename = log_info["filename"]
        else:
            filename = options["output_file"]

        filepath = os.path.join(os.getcwd(), filename)

        queryset = log_info["queryset"]

        total_rows = queryset.count()

        with self.start_progress(total=total_rows) as progress_update:
            try:
                for row in csv_file_generator(
                    log_type, filepath, overwrite=options["overwrite"]
                ):
                    progress_update(1)
            except (ValueError, IOError) as e:
                logger.error("Error trying to write csv file: {}".format(e))
                sys.exit(1)
