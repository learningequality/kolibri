from django.core.management.base import CommandError

from kolibri.core.tasks.management.commands.base import AsyncCommand


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

    def handle_async(self):
        raise CommandError(
            """
            exportusers command has been removed. Please use the bulkexportusers command.
            https://kolibri.readthedocs.io/en/latest/manage/command_line.html#export-to-csv
            """
        )
